import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlocklogClient } from '../../src/client';
import { 
  BlocklogAuthError, 
  BlocklogTransportError, 
  ApiError, 
  AuthenticationError, 
  RateLimitError, 
  ValidationError, 
  TransportError 
} from '../../src/errors';

describe('API Sub-Clients', () => {
  let client: BlocklogClient;
  let requestSpy: any;

  beforeEach(() => {
    client = new BlocklogClient({ apiKey: 'test' });
    requestSpy = vi.spyOn(client.transport, 'request').mockResolvedValue({});
  });

  afterEach(async () => {
    await client.shutdown();
  });

  it('DecisionsClient', async () => {
    await client.decisions.create({ type: 'x' });
    expect(requestSpy).toHaveBeenCalledWith('POST', '/decisions', { json: { type: 'x' } });
    
    await client.decisions.get('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/decisions/1');

    await client.decisions.update('1', { a: 1 });
    expect(requestSpy).toHaveBeenCalledWith('PUT', '/decisions/1', { json: { a: 1 } });

    await client.decisions.list({ limit: 10 });
    expect(requestSpy).toHaveBeenCalledWith('GET', '/decisions', { params: { limit: 10 } });

    await client.decisions.search({ query: 'test' });
    expect(requestSpy).toHaveBeenCalledWith('GET', '/decisions', { params: { query: 'test' } });

    await client.decisions.verify('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/decisions/1/verify');
  });

  it('TracesClient', async () => {
    await client.traces.get('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/traces/1');

    await client.traces.list({ limit: 10 });
    expect(requestSpy).toHaveBeenCalledWith('GET', '/traces', { params: { limit: 10 } });

    await client.traces.getTimeline('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/sessions/1/timeline');
  });

  it('ApprovalClient', async () => {
    await client.approvals.create({ decisionId: '1', reason: 'r' });
    expect(requestSpy).toHaveBeenCalledWith('POST', '/hitl/request', {
      json: { decision_id: '1', reason: 'r' },
    });

    await client.approvals.approve('1', 'r');
    expect(requestSpy).toHaveBeenCalledWith('POST', '/hitl/approve', {
      json: { approval_id: '1', auth_response: { status: 'approved', reason: 'r' } },
    });

    await client.approvals.reject('1', 'r');
    expect(requestSpy).toHaveBeenCalledWith('POST', '/hitl/reject', {
      json: { approval_id: '1', reviewer: 'system', rejection_reason: 'r', decision_id: undefined },
    });

    await client.approvals.status('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/hitl/1/status');

    await client.approvals.list({ limit: 10 });
    expect(requestSpy).toHaveBeenCalledWith('GET', '/hitl/audit-trail', { params: { limit: 10 } });
  });

  it('IncidentsClient', async () => {
    await client.incidents.create({ title: 't' });
    expect(requestSpy).toHaveBeenCalledWith('POST', '/incidents', { json: { title: 't' } });

    await client.incidents.get('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/incidents/1');

    await client.incidents.update('1', { a: 1 });
    expect(requestSpy).toHaveBeenCalledWith('PATCH', '/incidents/1', { json: { a: 1 } });

    await client.incidents.list({ limit: 10 });
    expect(requestSpy).toHaveBeenCalledWith('GET', '/incidents', { params: { limit: 10 } });

    await client.incidents.assign('1', 'user');
    expect(requestSpy).toHaveBeenCalledWith('POST', '/incidents/1/assign', { json: { assignee: 'user' } });

    await client.incidents.resolve('1', 'r');
    expect(requestSpy).toHaveBeenCalledWith('POST', '/incidents/1/resolve', { json: { resolution_summary: 'r' } });

    await client.incidents.close('1', 'r');
    expect(requestSpy).toHaveBeenCalledWith('POST', '/incidents/1/close', { json: { closure_notes: 'r', approval_status: 'approved' } });
  });

  it('ComplianceClient', async () => {
    await client.compliance.audit({ startDate: '2024-01-01' });
    expect(requestSpy).toHaveBeenCalledWith('POST', '/compliance/reports', {
      json: expect.objectContaining({ startDate: '2024-01-01', title: expect.any(String) }),
    });

    await client.compliance.verify('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/compliance/reports/1');

    await client.compliance.export({ format: 'pdf' });
    expect(requestSpy).toHaveBeenCalledWith('POST', '/compliance/reports', { json: { format: 'pdf' } });

    await client.compliance.getReport('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/compliance/reports/1');

    await client.compliance.getDashboard({ a: 1 });
    expect(requestSpy).toHaveBeenCalledWith('GET', '/compliance/dashboard', { params: { a: 1 } });

    await client.compliance.shareReport('1', ['a@b.com']);
    expect(requestSpy).toHaveBeenCalledWith('POST', '/compliance/reports/1/share', { json: { recipients: ['a@b.com'] } });

    await client.compliance.exportEvidence('1', 'pdf');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/compliance/reports/1/export', { params: { format: 'pdf' } });
  });

  it('ReplayClient', async () => {
    await client.replay.reconstruct('trace-123', { options: 'test' });
    expect(requestSpy).toHaveBeenCalledWith('POST', '/forensics/replays', {
      json: expect.objectContaining({ trace_id: 'trace-123' }),
    });

    await client.replay.verify('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/forensics/replays/1/verify');

    await client.replay.replay('1', { speed: 2 });
    expect(requestSpy).toHaveBeenCalledWith('POST', '/forensics/replays/1/execute', { json: { speed: 2 } });

    await client.replay.create({ t: 1 });
    expect(requestSpy).toHaveBeenCalledWith('POST', '/forensics/replays', { json: { t: 1 } });

    await client.replay.get('1');
    expect(requestSpy).toHaveBeenCalledWith('GET', '/forensics/replays/1');

    await client.replay.list({ a: 1 });
    expect(requestSpy).toHaveBeenCalledWith('GET', '/forensics/replays', { params: { a: 1 } });

    await client.replay.compare('a', 'b');
    expect(requestSpy).toHaveBeenCalledWith('POST', '/forensics/compare', {
      json: { baseline_session_id: 'a', candidate_session_id: 'b' },
    });
  });

  describe('HTTP Status Code Handling', () => {
    it('should handle 200 OK responses', async () => {
      requestSpy.mockResolvedValue({ success: true, data: 'test' });
      
      const result = await client.decisions.get('1');
      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('should handle 400 Bad Request responses', async () => {
      const error = new BlocklogTransportError('Bad Request', 400, 'Invalid input');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.create({ invalid: 'data' })).rejects.toThrow(BlocklogTransportError);
    });

    it('should handle 401 Unauthorized responses', async () => {
      const error = new BlocklogAuthError('Authentication failed');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.get('1')).rejects.toThrow(BlocklogAuthError);
    });

    it('should handle 403 Forbidden responses', async () => {
      const error = new BlocklogAuthError('Access denied');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.get('1')).rejects.toThrow(BlocklogAuthError);
    });

    it('should handle 404 Not Found responses', async () => {
      const error = new BlocklogTransportError('Not Found', 404, 'Resource not found');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.get('nonexistent')).rejects.toThrow(BlocklogTransportError);
    });

    it('should handle 429 Rate Limit responses', async () => {
      const error = new BlocklogTransportError('Rate limit exceeded', 429, 'Too many requests');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.list()).rejects.toThrow(BlocklogTransportError);
    });

    it('should handle 500 Internal Server Error responses', async () => {
      const error = new BlocklogTransportError('Internal Server Error', 500, 'Server error');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.create({ data: 'test' })).rejects.toThrow(BlocklogTransportError);
    });
  });

  describe('Error Model Mapping', () => {
    it('should map 401/403 to AuthenticationError', async () => {
      const error = new AuthenticationError('Invalid credentials');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.get('1')).rejects.toThrow(AuthenticationError);
    });

    it('should map 429 to RateLimitError', async () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.list()).rejects.toThrow(RateLimitError);
    });

    it('should map 400 to ValidationError', async () => {
      const error = new ValidationError('Invalid field', 'email', 'invalid-email');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.create({ invalid: 'data' })).rejects.toThrow(ValidationError);
    });

    it('should map transport errors to TransportError', async () => {
      const error = new TransportError('Network error', 503, 'Service unavailable');
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.get('1')).rejects.toThrow(TransportError);
    });

    it('should map generic errors to ApiError', async () => {
      const error = new ApiError('API Error', 500, 'INTERNAL_ERROR', { details: 'error details' });
      requestSpy.mockRejectedValue(error);
      
      await expect(client.decisions.get('1')).rejects.toThrow(ApiError);
    });
  });

  describe('Retry Behavior', () => {
    let retryClient: BlocklogClient;
    let retryRequestSpy: any;

    beforeEach(() => {
      vi.useFakeTimers();
      retryClient = new BlocklogClient({
        apiKey: 'test',
        flushInterval: 60_000,  // long enough to never fire during a test
      });
      retryRequestSpy = vi.spyOn(retryClient.transport, 'request').mockResolvedValue({});
    });

    afterEach(async () => {
      vi.useRealTimers();
      await retryClient.shutdown();
    });

    it('should retry on 429 responses', async () => {
      let attemptCount = 0;
      retryRequestSpy.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new BlocklogTransportError('Rate limit exceeded', 429, 'Too many requests');
        }
        return { success: true };
      });

      const retryPromise = retryClient.decisions.get('1');
      await vi.advanceTimersByTimeAsync(10_000); // enough for retry backoff, less than 60_000 flush interval
      await retryPromise;

      expect(attemptCount).toBe(3);
    });

    it('should retry on 500 responses', async () => {
      let attemptCount = 0;
      retryRequestSpy.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new BlocklogTransportError('Internal Server Error', 500, 'Server error');
        }
        return { success: true };
      });

      const retryPromise = retryClient.decisions.get('1');
      await vi.advanceTimersByTimeAsync(10_000); 
      await retryPromise;

      expect(attemptCount).toBe(2);
    });

    it('should not retry on 400 responses', async () => {
      let attemptCount = 0;
      retryRequestSpy.mockImplementation(async () => {
        attemptCount++;
        throw new BlocklogTransportError('Bad Request', 400, 'Invalid input');
      });

      await expect(retryClient.decisions.create({ invalid: 'data' })).rejects.toThrow();

      expect(attemptCount).toBe(1);
    });

    it('should not retry on 401 responses', async () => {
      let attemptCount = 0;
      retryRequestSpy.mockImplementation(async () => {
        attemptCount++;
        throw new BlocklogAuthError('Authentication failed');
      });

      await expect(retryClient.decisions.get('1')).rejects.toThrow();

      expect(attemptCount).toBe(1);
    });
  });
});