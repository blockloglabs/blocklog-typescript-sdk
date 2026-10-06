import { BaseClient } from './base';

export interface VerifyLogResult {
  status: string;
  merkle_proof?: any;
  batch_proof?: any;
  details?: any;
  [key: string]: any;
}

export interface VerifyBatchResult {
  status: string;
  signature?: string;
  signed_at?: string;
  details?: any;
  [key: string]: any;
}

export interface VerifyDecisionResult {
  status?: string;
  verified: boolean;
  signature?: string;
  hash?: string;
  [key: string]: any;
}

export class VerifyClient extends BaseClient {
  public async log(logId: string): Promise<VerifyLogResult> {
    return this.request<VerifyLogResult>('GET', `/verify/log/${logId}`);
  }

  public async batch(batchId: string): Promise<VerifyBatchResult> {
    return this.request<VerifyBatchResult>('GET', `/verify/batch/${batchId}`);
  }

  public async decision(decisionId: string): Promise<VerifyDecisionResult> {
    return this.request<VerifyDecisionResult>('GET', `/decisions/${decisionId}/verify`);
  }
}
