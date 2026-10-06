import { BaseClient } from './base';

export interface CreateReplayOptions {
  trace_id?: string;
  traceId?: string;
  token_id?: string;
  tokenId?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export class ReplayClient extends BaseClient {
  public async create(data: CreateReplayOptions) {
    const payload = {
      trace_id: data.trace_id || data.traceId,
      token_id: data.token_id || data.tokenId,
      metadata: data.metadata,
      ...data,
    };
    return this.request('POST', '/forensics/replays', {
      json: payload,
    });
  }

  public async get(id: string) {
    return this.request('GET', `/forensics/replays/${id}`);
  }

  public async list(params?: Record<string, any>) {
    return this.request('GET', '/forensics/replays', {
      params,
    });
  }

  public async timeline(id: string) {
    return this.request('GET', `/forensics/replays/${id}/timeline`);
  }

  public async rootCause(id: string) {
    return this.request('GET', `/forensics/replays/${id}/root-cause`);
  }

  public async causalGraph(id: string) {
    return this.request('GET', `/forensics/replays/${id}/causal-graph`);
  }

  public async staleness(id: string) {
    return this.request('GET', `/forensics/replays/${id}/staleness`);
  }

  public async divergence(id: string) {
    return this.request('GET', `/forensics/replays/${id}/divergence`);
  }

  public async counterfactual(
    id: string,
    options: { token_id?: string; tokenId?: string; modified_inputs: Record<string, any> }
  ) {
    return this.request('POST', `/forensics/replays/${id}/counterfactuals`, {
      json: {
        token_id: options.token_id || options.tokenId,
        modified_inputs: options.modified_inputs,
      },
    });
  }

  public async compare(idA: string, idB?: string) {
    if (idB) {
      return this.request('POST', '/forensics/compare', {
        json: {
          baseline_session_id: idA,
          candidate_session_id: idB,
        },
      });
    }
    return this.request('GET', `/forensics/compare/${idA}`);
  }

  public async getComparison(comparisonId: string) {
    return this.request('GET', `/forensics/compare/${comparisonId}`);
  }

  // Legacy compatibility helpers
  public async reconstruct(traceId: string, options?: Record<string, any>) {
    return this.create({ traceId, ...options });
  }

  public async verify(id: string) {
    return this.request('GET', `/forensics/replays/${id}/verify`);
  }

  public async replay(id: string, options?: Record<string, any>) {
    return this.request('POST', `/forensics/replays/${id}/execute`, {
      json: options || {},
    });
  }
}