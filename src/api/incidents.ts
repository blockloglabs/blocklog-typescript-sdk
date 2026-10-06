import { BaseClient } from './base';

export class IncidentsClient extends BaseClient {
  public async create(data: Record<string, any>) {
    return this.request('POST', '/incidents', { json: data });
  }

  public async get(id: string) {
    return this.request('GET', `/incidents/${id}`);
  }

  public async update(id: string, data: Record<string, any>) {
    return this.request('PATCH', `/incidents/${id}`, { json: data });
  }

  public async list(params?: Record<string, any>) {
    return this.request('GET', '/incidents', { params });
  }

  public async assign(id: string, assignee: string, notes?: string) {
    return this.request('POST', `/incidents/${id}/assign`, {
      json: { assignee, ...(notes ? { notes } : {}) },
    });
  }

  public async resolve(
    id: string,
    options?: string | { summary?: string; reason?: string; root_cause?: any; remediation_actions?: any }
  ) {
    const summary =
      typeof options === 'string'
        ? options
        : options?.summary || options?.reason || 'Resolved';
    const root_cause = typeof options === 'object' ? options?.root_cause : undefined;
    const remediation_actions =
      typeof options === 'object' ? options?.remediation_actions : undefined;

    return this.request('POST', `/incidents/${id}/resolve`, {
      json: {
        resolution_summary: summary,
        root_cause,
        remediation_actions,
      },
    });
  }

  public async close(
    id: string,
    options?: string | { notes?: string; reason?: string; approval_status?: string }
  ) {
    const notes =
      typeof options === 'string'
        ? options
        : options?.notes || options?.reason || '';
    const approval_status =
      typeof options === 'object' && options?.approval_status
        ? options.approval_status
        : 'approved';

    return this.request('POST', `/incidents/${id}/close`, {
      json: {
        closure_notes: notes,
        approval_status,
      },
    });
  }

  public async report(id: string) {
    return this.request('POST', `/incidents/${id}/report`, { json: {} });
  }

  public async getReport(id: string) {
    return this.request('GET', `/incidents/${id}/report`);
  }

  public async annotate(id: string, text: string, author?: string) {
    return this.request('POST', `/incidents/${id}/annotations`, {
      json: { text, ...(author ? { author } : {}) },
    });
  }

  public async annotations(id: string) {
    return this.request('GET', `/incidents/${id}/annotations`);
  }

  public async addWorkspaceItem(
    id: string,
    item: { item_type: string; reference_id: string; label?: string }
  ) {
    return this.request('POST', `/incidents/${id}/workspace`, {
      json: item,
    });
  }

  public async workspaceItems(id: string) {
    return this.request('GET', `/incidents/${id}/workspace`);
  }
}