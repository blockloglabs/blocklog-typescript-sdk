/**
 * Receipt Verification Models
 *
 * Types for receipt verification result structures.
 */

/**
 * Verification result structure
 */
export interface ReceiptVerificationResult {
  /** Whether verification was successful */
  successful: boolean;
  
  /** Receipt ID if available */
  receiptId?: string;
  
  /** List of verification errors */
  errors: string[];
  
  /** List of verification warnings */
  warnings: string[];
  
  /** Timestamp of verification */
  verifiedAt: string;
}

/**
 * Receipt data structure
 */
export interface ReceiptData {
  /** Unique receipt identifier */
  receipt_id: string;
  
  /** Correlation ID linking to execution */
  correlation_id: string;
  
  /** Canonical serialization hash (SHA-256 hex) */
  canonical_serialization_hash: string;
  
  /** Merkle root for batch inclusion */
  merkle_root: string;
  
  /** Merkle proof steps */
  merkle_proof: {
    steps: MerkleProofStep[];
  };
  
  /** Ed25519 signature (base64) */
  signature: string;
  
  /** Signature timestamp */
  signature_timestamp: string;
  
  /** Signer identity */
  signer_identity: string;
  
  /** Signing algorithm (default: "ed25519") */
  signing_algorithm?: string;
  
  /** Commitments for cryptographic binding */
  commitments?: {
    execution_commitment: string;
    input_commitment: string;
    decision_commitment: string;
    action_commitment: string;
    outcome_commitment?: string;
  };
  
  /** Receipt status */
  status?: 'ISSUED' | 'VERIFIED' | 'CONSUMED' | 'EXPIRED' | 'REVOKED';
}

/**
 * Merkle proof step
 */
export interface MerkleProofStep {
  /** Direction: 'left' or 'right' */
  direction: string;
  
  /** Hash value for this step */
  hash: string;
}

/**
 * Verification options
 */
export interface VerifyReceiptOptions {
  /** Verify Ed25519 signature (default: true) */
  verifySignature?: boolean;
  
  /** Verify Merkle proof (default: true) */
  verifyMerkle?: boolean;
  
  /** Override public key for this verification */
  publicKey?: string;
}
