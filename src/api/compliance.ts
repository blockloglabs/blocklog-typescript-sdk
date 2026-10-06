import { BaseClient } from './base';

export interface ComplianceReportCreateOptions {
  title?: string;
  report_kind?: string;
  scope_type?: 'company' | 'trace' | 'session' | 'workflow' | 'token' | 'replay';
  trace_id?: string;
  session_id?: string;
  workflow_id?: string;
  token_id?: string;
  replay_session_id?: string;
  framework?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface ComplianceShareOptions {
  recipients?: string[];
  emails?: string[];
  recipient_email?: string;
  note?: string;
  create_auditor_api_key?: boolean;
  expires_in_days?: number;
  expires_in?: number;
}

export class ComplianceClient extends BaseClient {
  public async generate(options: ComplianceReportCreateOptions = {}) {
    const scope_type = options.scope_type || (options.trace_id ? 'trace' : 'company');
    const title = options.title || `Compliance Report - ${options.framework || 'General'}`;
    const payload = {
      title,
      report_kind: options.report_kind || 'design_partner_readiness',
      scope_type,
      ...options,
    };
    return this.request('POST', '/compliance/reports', { json: payload });
  }

  public async create(options: ComplianceReportCreateOptions = {}) {
    return this.generate(options);
  }

  public async audit(params?: Record<string, any>) {
    return this.generate(params);
  }

  public async getReport(id: string) {
    return this.request('GET', `/compliance/reports/${id}`);
  }

  public async get(id: string) {
    return this.getReport(id);
  }

  public async list() {
    return this.request('GET', '/compliance/reports');
  }

  public async getDashboard(params?: Record<string, any>) {
    return this.request('GET', '/compliance/dashboard', {
      params,
    });
  }

  public async dashboard() {
    return this.getDashboard();
  }

  public async shareReport(
    id: string,
    options: string[] | ComplianceShareOptions
  ) {
    let payload: Record<string, any>;
    if (Array.isArray(options)) {
      payload = { recipients: options };
    } else {
      payload = {
        recipients: options.recipients || options.emails || (options.recipient_email ? [options.recipient_email] : []),
        note: options.note,
        create_auditor_api_key: options.create_auditor_api_key,
        expires_in_days: options.expires_in_days || (options.expires_in ? Math.max(1, Math.floor(options.expires_in / 86400)) : 30),
      };
    }
    return this.request('POST', `/compliance/reports/${id}/share`, {
      json: payload,
    });
  }

  public async share(id: string, options: string[] | ComplianceShareOptions) {
    return this.shareReport(id, options);
  }

  public async export(
    idOrParams: string | { format?: string; dateRange?: { start: string; end: string } },
    options?: { download?: boolean }
  ) {
    if (typeof idOrParams === 'string') {
      return this.request('GET', `/compliance/reports/${idOrParams}/export`, {
        params: { download: options?.download ?? false },
      });
    }
    // Fallback for legacy test calls
    return this.request('POST', '/compliance/reports', { json: idOrParams });
  }

  public async exportEvidence(id: string, format: string = 'pdf') {
    return this.request('GET', `/compliance/reports/${id}/export`, {
      params: { format },
    });
  }

  public async verify(id: string) {
    return this.request('GET', `/compliance/reports/${id}`);
  }
}