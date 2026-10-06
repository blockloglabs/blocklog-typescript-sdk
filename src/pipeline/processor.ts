import { ResolvedConfig } from '../config/config';
import { SyncTransport } from '../transport/fetch';
import { MemoryQueue } from '../queue/memory';
import { PersistentQueue } from '../queue/persistent';
import { DeadLetterQueue } from '../queue/deadletter';
import { EventEnvelope } from '../models/events';
import { hashSignHmac, hashSignEd25519 } from '../signing/crypto';
import { EventEmitter } from './emitter';
import { IngestResponse } from '../models/responses';
import { RetryPolicy } from '../transport/retry';
import { createHash } from 'crypto';

export class EventProcessor {
  private config: ResolvedConfig;
  private transport: SyncTransport;
  private memoryQueue: MemoryQueue;
  private persistentQueue: PersistentQueue;
  private dlq: DeadLetterQueue;
  private hooks: ((payload: Record<string, any>) => Record<string, any>)[] = [];
  public emitter: EventEmitter;
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing: boolean = false;
  private retryPolicy: RetryPolicy;

  constructor(
    config: ResolvedConfig,
    transport: SyncTransport,
    memoryQueue?: MemoryQueue,
    persistentQueue?: PersistentQueue,
    dlq?: DeadLetterQueue,
  ) {
    this.config = config;
    this.transport = transport;
    this.memoryQueue = memoryQueue || new MemoryQueue();
    this.persistentQueue = persistentQueue || new PersistentQueue();
    this.dlq = dlq || new DeadLetterQueue();
    this.emitter = new EventEmitter();
    this.retryPolicy = new RetryPolicy({
      maxRetries: config.retryCount,
      baseDelayMs: 200,
    });

    if (this.config.flushInterval > 0) {
      this.startFlushTimer();
    }

    this.recoverPersistentEvents();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.config.flushInterval);
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  private async recoverPersistentEvents(): Promise<void> {
    if (!this.config.persistenceEnabled) return;
    const len = this.persistentQueue.length;
    if (len > 0) {
      const items = await this.persistentQueue.peek(len);
      await this.memoryQueue.enqueueBatch(items);
    }
  }

  public addHook(hook: (payload: Record<string, any>) => Record<string, any>): void {
    this.hooks.push(hook);
  }

  public async processEvent(
    eventType: string,
    payload: Record<string, any>,
    options?: Record<string, any>
  ): Promise<any> {
    const envelope = this.buildEnvelope(eventType, payload, options);

    let processedPayload: any = { ...envelope };
    for (const hook of this.hooks) {
      processedPayload = hook(processedPayload) as any;
    }

    if (this.config.enableSigning && this.config.signingKey) {
      if (this.config.signingAlg === 'hmac-sha256') {
        processedPayload.log_signature = hashSignHmac(processedPayload, this.config.signingKey);
      } else {
        processedPayload.log_signature = hashSignEd25519(processedPayload, this.config.signingKey);
      }
    }

    await this.emitter.emit('event:processed', processedPayload);

    if (options?.immediate) {
      return this.sendImmediate(processedPayload);
    }

  await this.memoryQueue.enqueue(processedPayload);
  if (this.config.persistenceEnabled) {
    await this.persistentQueue.enqueue(processedPayload);
  }

  if (!options?.noAutoFlush && this.memoryQueue.length >= this.config.batchSize) {
    await this.flush();
  }

    return null;
  }

  private buildEnvelope(
    eventType: string,
    payload: Record<string, any>,
    options?: Record<string, any>
  ): EventEnvelope {
    const envelope: EventEnvelope = {
      event_type: eventType,
      payload,
      source: options?.source || 'typescript-sdk',
      timestamp: new Date().toISOString(),
      trace_id: options?.trace_id || null,
      session_id: options?.session_id || null,
      workflow_id: options?.workflow_id || null,
      agent_id: options?.agent_id || null,
      parent_event_id: options?.parent_event_id || null,
      root_event_id: options?.root_event_id || null,
      span_id: options?.span_id || null,
      attempt_no: options?.attempt_no || 1,
      causality_type: options?.causality_type || null,
      schema_version: '1.0',
      event_version: '1.0',
      agent_metadata: options?.agent_metadata || {},
    };

    envelope.idempotency_key = options?.idempotency_key ?? this.generateIdempotencyKey(envelope);

    return envelope;
  }

  private generateIdempotencyKey(envelope: EventEnvelope): string {
    const raw = `${envelope.event_type}:${envelope.source}:${envelope.trace_id}:${envelope.session_id}:${envelope.timestamp}`;
    return `blk_${createHash('sha256').update(raw).digest('hex').substring(0, 32)}`;
  }

  private async sendImmediate(envelope: EventEnvelope): Promise<IngestResponse> {
    try {
      // Every processor envelope carries a unique idempotency key. Retrying is
      // therefore limited to that keyed ingestion request.
      return await this.retryPolicy.run(() => this.transport.request('POST', '/logs', { json: envelope }));
    } catch (err: any) {
      await this.dlq.add(envelope, err?.message || 'Failed after max retries');
      throw err;
    }
  }

  public async flush(): Promise<IngestResponse> {
    if (this.flushing) {
      return { ingested: 0, log_ids: [] };
    }
    this.flushing = true;

    let totalIngested = 0;
    const allLogIds: string[] = [];

    try {
      while (true) {
        const items = await this.memoryQueue.peek(this.config.batchSize);
        if (items.length === 0) break;

        const body = { logs: items };

        try {
          const response = await this.retryPolicy.run(() => this.transport.request<{ ingested?: number; log_ids?: string[] }>('POST', '/logs/batch', { json: body }));
          await this.memoryQueue.dequeue(items.length);
          await this.persistentQueue.dequeue(items.length);
          totalIngested += response.ingested ?? 0;
          allLogIds.push(...(response.log_ids ?? []));
        } catch (err: any) {
          for (const item of items) {
            await this.dlq.add(item, err?.message || 'Batch send failed');
          }
          await this.memoryQueue.dequeue(items.length);
          await this.persistentQueue.dequeue(items.length);
          throw err;
        }
      }

      return { ingested: totalIngested, log_ids: allLogIds };
    } finally {
      this.flushing = false;
    }
  }

  public shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
