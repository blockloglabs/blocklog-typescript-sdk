import { BaseClient } from './base';

export interface ApprovalRequestOptions {
  decisionId?: string;
  decision_id?: string;
  logId?: string;
  log_id?: string;
  reason: string;
  reviewer?: string;
  metadata?: Record<string, any>;
}

export interface EscalateOptions {
  current_reviewer: string;
  escalation_target: string;
  escalation_reason: string;
  approval_id?: string;
}

export class ApprovalClient extends BaseClient {
  public async create(data: ApprovalRequestOptions) {
    const payload: Record<string, any> = {
      reason: data.reason,
    };
    const decisionId = data.decision_id || data.decisionId;
    if (decisionId) payload.decision_id = decisionId;
    const logId = data.log_id || data.logId;
    if (logId) payload.log_id = logId;
    if (data.reviewer) payload.reviewer = data.reviewer;
    if (data.metadata) payload.metadata = data.metadata;

    return this.request('POST', '/hitl/request', {
      json: payload,
    });
  }

  public async requestApproval(data: ApprovalRequestOptions) {
    return this.create(data);
  }

  public async approve(
    id: string,
    options?: string | { reason?: string; auth_response?: Record<string, any> }
  ) {
    const auth_response =
      typeof options === 'object' && options?.auth_response
        ? options.auth_response
        : { status: 'approved', reason: typeof options === 'string' ? options : options?.reason || 'Approved' };

    return this.request('POST', '/hitl/approve', {
      json: {
        approval_id: id,
        auth_response,
      },
    });
  }

  public async reject(
    id: string,
    options?: string | { reason?: string; reviewer?: string; decision_id?: string }
  ) {
    const reason =
      typeof options === 'string' ? options : options?.reason || 'Rejected';
    const reviewer = typeof options === 'object' ? options?.reviewer || 'system' : 'system';
    const decision_id = typeof options === 'object' ? options?.decision_id : undefined;

    return this.request('POST', '/hitl/reject', {
      json: {
        approval_id: id,
        reviewer,
        rejection_reason: reason,
        decision_id,
      },
    });
  }

  public async escalate(data: EscalateOptions) {
    return this.request('POST', '/hitl/escalate', {
      json: data,
    });
  }

  public async listOverrides() {
    return this.request('GET', '/hitl/overrides');
  }

  public async getOverride(id: number | string) {
    return this.request('GET', `/hitl/overrides/${id}`);
  }

  public async auditTrail() {
    return this.request('GET', '/hitl/audit-trail');
  }

  public async status(id: string) {
    return this.request('GET', `/hitl/${id}/status`);
  }

  public async list(params?: Record<string, any>) {
    return this.request('GET', '/hitl/audit-trail', {
      params,
    });
  }
}