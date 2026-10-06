import { BaseClient } from './base';

export class DecisionsClient extends BaseClient {
  public async create(data: Record<string, any>) {
    return this.request('POST', '/decisions', { json: data });
  }

  public async get(id: string) {
    return this.request('GET', `/decisions/${id}`);
  }

  public async list(params?: Record<string, any>) {
    return this.request('GET', '/decisions', { params });
  }

  public async search(query: Record<string, any>) {
    return this.list(query);
  }

  public async update(id: string, data: Record<string, any>) {
    return this.request('PUT', `/decisions/${id}`, { json: data });
  }

  public async verify(id: string) {
    return this.request<{ verified: boolean; signature?: string; hash?: string }>(
      'GET',
      `/decisions/${id}/verify`,
    );
  }

  public async timeline(id: string) {
    return this.request('GET', `/decisions/${id}/timeline`);
  }

  public async evidence(id: string) {
    return this.request('GET', `/decisions/${id}/evidence`);
  }

  public async replay(id: string) {
    return this.request('GET', `/decisions/${id}/replay`);
  }
}

