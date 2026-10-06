/**
 * blocklog.api.executionGateway
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Layer 2 client for execution gateway features (PHASE 2 & 3):
 *
 * - Risk assessment calculation and storage
 * - Policy evaluation with risk scoring
 * - Token consumption tracking (one-time usage)
 * - Authorization with gateway enforcement
 *
 * Available via `client.executionGateway.*`.
 *
 * Backend endpoints
 * -----------------
 * - POST /api/v1/execution/authorize
 * - POST /api/v1/execution/verify
 * - POST /api/v1/execution/consume
 * - GET  /api/v1/execution/policies
 * - POST /api/v1/execution/policies
 * - GET  /api/v1/execution/receipts/{receiptId}
 * - POST /api/v1/execution/simulations
 */

import { BlocklogClient } from '../client';
import { RetryPolicy } from '../transport/retry';
import { ReceiptVerificationClient } from './receiptVerification';
import { SyncTransport } from '../transport/fetch';

/**
 * Authorization outcome with risk scoring.
 */
export interface AuthorizationOutcome {
  decision: 'APPROVED' | 'DENIED' | 'SHADOW_ALLOW' | 'SHADOW_DENY';
  reasons: string[];
  shadow_mode: boolean;
  policy_id: string | null;
  policy_hash: string | null;
  risk_score: number | null;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  risk_factors: Record<string, any> | null;
}

/**
 * Authorization response from the gateway.
 */
export interface AuthorizeResponse {
  token: string | null;
  token_id: string | null;
  token_expires_at: string | null;
  receipt_id: string;
  receipt_signature: string;
  status: string;
  outcome: AuthorizationOutcome;
}

/**
 * Verification response.
 */
export interface VerifyResponse {
  authorized: boolean;
  token_id: string | null;
  receipt_id: string;
  status: string;
  reasons: string[];
  shadow_mode: boolean;
  expires_at: string | null;
}

/**
 * Consumption response (PHASE 3).
 */
export interface ConsumeResponse {
  consumed_at: string;
  token_consumed: boolean;
  execution_reference: string | null;
  token_id: string | null;
  status: string;
}

/**
 * Risk calculation result.
 */
export interface RiskResult {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors: Record<string, any>;
}

/**
 * Policy management response.
 */
export interface PolicyListResponse {
  items: any[];
  total?: number;
}

/**
 * Receipt response.
 */
export interface ReceiptResponse {
  id: string;
  token_id: string | null;
  receipt_type: string;
  status: string;
  processor: string | null;
  action_type: string | null;
  transaction_reference: string | null;
  receipt_payload: Record<string, any>;
  receipt_hash: string;
  signature: string;
  created_at: string;
}

/**
 * Execution Gateway Client for PHASE 2 & 3 features.
 *
 * Provides high-level access to the execution gateway which:
 * - Evaluates policies with risk scoring (0-100 scale)
 * - Creates signed execution tokens
 * - Tracks token consumption (one-time usage)
 * - Maintains governance records (risk assessments, policy evaluations)
 *
 * Accessed as `client.executionGateway`.
 *
 * @example
 * // Authorize an execution with risk scoring
 * const result = await client.executionGateway.authorize({
 *   processor: 'payment',
 *   action_type: 'transfer',
 *   amount_minor: 500000,
 *   currency: 'USD',
 *   execution_reference: 'tx_123'
 * });
 * console.log(result.outcome.risk_score);  // e.g., 45
 * console.log(result.outcome.risk_level);  // "MEDIUM"
 *
 * @example
 * // Verify and consume a token
 * const verification = await client.executionGateway.verify({
 *   token: result.token!
 * });
 * console.log(verification.authorized);  // true
 *
 * @example
 * // Calculate risk for pre-screening
 * const risk = await client.executionGateway.calculateRisk({
 *   action_type: 'transfer',
 *   amount_minor: 750000,
 *   destination: null,
 *   delegation_depth: 4
 * });
 * console.log(`Risk: ${risk.risk_score} (${risk.risk_level})`);
 */
export class ExecutionGatewayClient {
  private readonly client: BlocklogClient;
  private readonly retry: RetryPolicy;

  constructor(client: BlocklogClient) {
    this.client = client;
    this.retry = client.retry;
  }

  /**
   * Authorize an execution through the gateway with policy evaluation.
   *
   * The gateway evaluates all matching policies, calculates risk scores,
   * and returns a signed execution token if authorized.
   *
   * @param params - Authorization parameters
   * @returns Authorization response with token and risk information
   */
  async authorize(params: {
    processor: string;
    action_type: string;
    amount_minor?: number;
    currency?: string;
    destination?: string;
    trace_id?: string;
    session_id?: string;
    workflow_id?: string;
    idempotency_key?: string;
    subject_reference?: string;
    transaction_reference?: string;
    context?: Record<string, any>;
    approval?: Record<string, any>;
  }): Promise<AuthorizeResponse> {
    const response = await this.retry.run(async () =>
      this.client.transport.request('POST', '/execution/authorize', {
        json: params,
      })
    );
    return response as AuthorizeResponse;
  }

  /**
   * Verify an execution token and return authorization status.
   *
   * @param params - Verification parameters
   * @returns Verification response
   */
  async verify(params: {
    token: string;
    enforce?: boolean;
  }): Promise<VerifyResponse> {
    const response = await this.retry.run(async () =>
      this.client.transport.request('POST', '/execution/verify', {
        json: params,
      })
    );
    return response as VerifyResponse;
  }

  /**
   * Consume an execution token - enforces one-time usage.
   *
   * Tokens can only be consumed once. Subsequent consumption attempts
   * return a 409 Conflict error.
   *
   * @param params - Consumption parameters
   * @returns Consumption response
   */
  async consume(params: {
    token: string;
    processor: string;
    action_type: string;
    execution_reference?: string;
    transaction_reference?: string;
  }): Promise<ConsumeResponse> {
    const response = await this.retry.run(async () =>
      this.client.transport.request('POST', '/execution/consume', {
        json: params,
      })
    );
    return response as ConsumeResponse;
  }

  /**
   * Calculate risk score for an action.
   *
   * This is the same scoring logic used by the gateway during
   * policy evaluation. Useful for pre-screening before execution.
   *
   * @param params - Risk calculation parameters
   * @returns Risk calculation result
   */
  async calculateRisk(params: {
    action_type: string;
    amount_minor: number;
    currency?: string;
    destination?: string;
    agent_trust_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    delegation_depth?: number;
    context_stale?: boolean;
    policy_violations?: number;
    amount_thresholds?: Record<string, number>;
  }): Promise<RiskResult> {
    const response = await this.retry.run(async () =>
      this.client.transport.request('POST', '/execution/simulations', {
        json: params,
      })
    );
    return response as RiskResult;
  }

  /**
   * List all execution policies.
   *
   * @param limit - Maximum number of policies to return
   * @param offset - Pagination offset
   * @returns Policy list response
   */
  async listPolicies(limit: number = 100, offset: number = 0): Promise<PolicyListResponse> {
    const response = await this.retry.run(async () =>
      this.client.transport.request('GET', '/execution/policies', {
        params: { limit, offset },
      })
    );
    return response as PolicyListResponse;
  }

  /**
   * Get a specific policy by ID.
   *
   * @param policyId - UUID of the policy
   * @returns Policy object
   */
  async getPolicy(policyId: string): Promise<any> {
    const response = await this.retry.run(async () =>
      this.client.transport.request('GET', `/execution/policies/${policyId}`)
    );
    return response;
  }

  /**
   * Get an execution receipt.
   *
   * Receipts are immutable records of authorization and verification events.
   * Each signed token corresponds to multiple receipts (ISSUED, VERIFIED,
   * CONSUMED, EXPIRED, etc.).
   *
   * @param receiptId - UUID of the receipt
   * @returns Receipt object
   */
  async getReceipt(receiptId: string): Promise<ReceiptResponse> {
    const response = await this.retry.run(async () =>
      this.client.transport.request('GET', `/execution/receipts/${receiptId}`)
    );
    return response as ReceiptResponse;
  }

  /**
   * Verify an execution receipt cryptographically.
   *
   * This method performs standalone verification of a receipt without
   * requiring database access. It validates:
   * - Canonical hash integrity
   * - Ed25519 signature (if publicKey provided)
   * - Merkle proof (if included)
   *
   * @param receiptJson - JSON string of the receipt to verify
   * @param options - Verification options
   * @returns Verification result
   */
  async verifyReceipt(
    receiptJson: string,
    options?: {
      publicKey?: string;
      verifySignature?: boolean;
      verifyMerkle?: boolean;
    }
  ): Promise<import('../models/receipt').ReceiptVerificationResult> {
    const { publicKey, verifySignature = true, verifyMerkle = true } = options || {};
    
    // Use the ReceiptVerificationClient for standalone verification
    const verifier = new ReceiptVerificationClient();
    return verifier.verifyReceipt(receiptJson, {
      publicKey,
      verifySignature,
      verifyMerkle,
    });
  }

  /**
   * List execution receipts with filtering.
   *
   * @param options - Filtering options
   * @returns Receipt list response
   */
  async listReceipts(options?: {
    status?: string;
    policyId?: string;
    processor?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const { status, policyId, processor, limit = 100, offset = 0 } = options || {};
    const params: Record<string, any> = { limit, offset };
    if (status) params.status = status;
    if (policyId) params.policy_id = policyId;
    if (processor) params.processor = processor;

    const response = await this.retry.run(async () =>
      this.client.transport.request('GET', '/execution/receipts', {
        params,
      })
    );
    return response;
  }
}
