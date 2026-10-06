import { z } from 'zod';
import { randomUUID } from 'crypto';

export const EventEnvelopeSchema = z.object({
  event_type: z.string(),
  payload: z.record(z.string(), z.any()),
  source: z.string().default('typescript-sdk'),
  timestamp: z.string().default(() => new Date().toISOString()),
  idempotency_key: z.string().optional(),
  trace_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  workflow_id: z.string().uuid().optional().nullable(),
  parent_event_id: z.string().uuid().optional().nullable(),
  root_event_id: z.string().uuid().optional().nullable(),
  span_id: z.string().optional().nullable(),
  attempt_no: z.number().int().default(1),
  causality_type: z.string().optional().nullable(),
  schema_version: z.string().default('1.0'),
  event_version: z.string().default('1.0'),
  agent_type: z.string().optional().nullable(),
  agent_id: z.string().optional().nullable(),
  agent_metadata: z.record(z.string(), z.any()).default({}),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

/** Portable, future-facing agent event metadata. It maps to the current log
 * ingestion envelope and does not imply a separate backend event endpoint. */
export interface AgentEvent {
  id?: string;
  executionId?: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp?: string;
  sequence?: number;
  parentEventId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
}

/** Model-call payload convention for an AgentEvent. */
export interface LLMCall {
  provider?: string;
  model?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  usage?: Record<string, unknown>;
}

/** Tool-call payload convention for an AgentEvent. */
export interface ToolCall {
  name: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status?: string;
}

/** Backend-issued receipt boundary; receipt issuance remains backend-specific. */
export interface ExecutionReceipt {
  executionId: string;
  receiptId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export const SessionContextSchema = z.object({
  trace_id: z.string().uuid().default(() => randomUUID()),
  session_id: z.string().uuid().default(() => randomUUID()),
  workflow_id: z.string().uuid().optional().nullable(),
  agent_id: z.string().optional().nullable(),
  source: z.string().default('typescript-sdk'),
});

export type SessionContext = z.infer<typeof SessionContextSchema>;
