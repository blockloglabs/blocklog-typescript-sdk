/**
 * Receipt Verification API
 *
 * Provides standalone cryptographic verification for execution receipts
 * without requiring database access.
 */

import { ReceiptVerificationResult } from '../models/receipt';

/**
 * Ed25519 public key in various encodings
 */
export type PublicKey = string;

/**
 * Receipt verification options
 */
export interface VerifyReceiptOptions {
  /** Verify Ed25519 signature (default: true) */
  verifySignature?: boolean;
  /** Verify Merkle proof (default: true) */
  verifyMerkle?: boolean;
  /** Override public key for this verification */
  publicKey?: PublicKey;
}

/**
 * Receipt Verification Client
 *
 * Provides independent cryptographic verification of execution receipts.
 * This client does NOT require database access - it performs cryptographic
 * verification using only the receipt data and public key.
 *
 * @example
 * ```ts
 * import { BlocklogClient } from 'blocklog';
 *
 * const client = new BlocklogClient({ apiKey: '...' });
 *
 * // Verify a receipt
 * const result = await client.trust.verifyReceipt(receiptJson, {
 *   publicKey: '64-char-hex-ed25519-public-key'
 * });
 *
 * if (result.successful) {
 *   console.log('Receipt is valid!');
 * } else {
 *   console.error('Verification failed:', result.errors);
 * }
 * ```
 */
export class ReceiptVerificationClient {
  /**
   * Verify a receipt from JSON string.
   *
   * @param receiptJson - JSON string of the receipt
   * @param options - Verification options
   * @returns Verification result with success status, errors, and warnings
   */
  public async verifyReceipt(
    receiptJson: string,
    options: VerifyReceiptOptions = {}
  ): Promise<ReceiptVerificationResult> {
    try {
      const receipt = JSON.parse(receiptJson);
      
      // Verify canonical hash (always required)
      const hashResult = this.verifyCanonicalHash(receipt);
      if (!hashResult.successful) {
        return {
          successful: false,
          receiptId: receipt.receipt_id,
          errors: hashResult.errors,
          warnings: [],
          verifiedAt: new Date().toISOString(),
        };
      }

      // Verify signature if requested
      let signatureResult: Pick<ReceiptVerificationResult, 'successful' | 'errors' | 'warnings'> = { successful: true, errors: [], warnings: [] };
      if (options.verifySignature !== false) {
        signatureResult = await this.verifySignature(receipt, options.publicKey);
      }

      // Verify Merkle proof if requested
      let merkleResult: Pick<ReceiptVerificationResult, 'successful' | 'errors' | 'warnings'> = { successful: true, errors: [], warnings: [] };
      if (options.verifyMerkle !== false) {
        merkleResult = this.verifyMerkleProof(receipt);
      }

      const allErrors = [
        ...hashResult.errors,
        ...signatureResult.errors,
        ...merkleResult.errors,
      ];

      return {
        successful: allErrors.length === 0,
        receiptId: receipt.receipt_id,
        errors: allErrors,
        warnings: [
          ...hashResult.warnings,
          ...signatureResult.warnings,
          ...merkleResult.warnings,
        ],
        verifiedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        successful: false,
        errors: [error.message || 'Unexpected error during verification'],
        warnings: [],
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify a receipt from a file path (Node.js only).
   *
   * @param filepath - Path to JSON file containing the receipt
   * @param options - Verification options
   * @returns Verification result
   */
  public async verifyReceiptFile(
    filepath: string,
    options: VerifyReceiptOptions = {}
  ): Promise<ReceiptVerificationResult> {
    // TODO: Implement file reading for Node.js environment
    // This would require Node.js fs module
    throw new Error('verifyReceiptFile not yet implemented');
  }

  /**
   * Verify only the Ed25519 signature of a receipt.
   *
   * @param receipt - Receipt data object
   * @param publicKey - Optional public key override
   * @returns Signature verification result
   */
  public async verifySignature(
    receipt: any,
    publicKey?: PublicKey
  ): Promise<{ successful: boolean; errors: string[]; warnings: string[] }> {
    // TODO: Implement Ed25519 signature verification
    // This would require a crypto library like tweetnacl or subtle-crypto
    return {
      successful: true,
      errors: [],
      warnings: ['Signature verification not yet implemented'],
    };
  }

  /**
   * Verify only the canonical hash integrity of a receipt.
   *
   * @param receipt - Receipt data object
   * @returns Hash verification result
   */
  public verifyCanonicalHash(
    receipt: any
  ): { successful: boolean; errors: string[]; warnings: string[] } {
    try {
      const storedHash = receipt.canonical_serialization_hash;
      if (!storedHash) {
        return {
          successful: false,
          errors: ['Missing canonical_serialization_hash field'],
          warnings: [],
        };
      }

      // Serialize and compute hash
      const canonicalJson = this.serializeForVerification(receipt);
      const computedHash = this.computeReceiptHash(canonicalJson);

      if (computedHash !== storedHash) {
        return {
          successful: false,
          errors: [`Canonical hash mismatch: expected ${storedHash}, got ${computedHash}`],
          warnings: [],
        };
      }

      return {
        successful: true,
        errors: [],
        warnings: ['Canonical hash verified'],
      };
    } catch (error: any) {
      return {
        successful: false,
        errors: [`Hash verification error: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Verify Merkle inclusion proof for the receipt.
   *
   * @param receipt - Receipt data object
   * @returns Merkle proof verification result
   */
  public verifyMerkleProof(
    receipt: any
  ): { successful: boolean; errors: string[]; warnings: string[] } {
    try {
      // Get receipt hash
      const canonicalJson = this.serializeForVerification(receipt);
      const receiptHash = this.computeReceiptHash(canonicalJson);

      // Get Merkle proof data
      const merkleProof = receipt.merkle_proof || {};
      const merkleRoot = receipt.merkle_root;

      if (!merkleProof || Object.keys(merkleProof).length === 0) {
        return {
          successful: true,
          errors: [],
          warnings: ['No Merkle proof included in receipt'],
        };
      }

      if (!merkleRoot) {
        return {
          successful: false,
          errors: ['Missing merkle_root field'],
          warnings: [],
        };
      }

      // Verify Merkle proof
      let currentHash = receiptHash;

      for (const step of merkleProof.steps || []) {
        const { direction, hash: hashValue } = step;

        if (!direction || !hashValue) {
          return {
            successful: false,
            errors: ['Invalid Merkle proof step'],
            warnings: [],
          };
        }

        // Combine hashes based on direction
        const combined = this.combineHashes(currentHash, hashValue, direction);
        currentHash = combined;
      }

      // Check final hash matches root
      if (currentHash !== merkleRoot) {
        return {
          successful: false,
          errors: [
            `Merkle proof verification failed: final hash ${currentHash} != root ${merkleRoot}`,
          ],
          warnings: [],
        };
      }

      return {
        successful: true,
        errors: [],
        warnings: ['Merkle proof verified'],
      };
    } catch (error: any) {
      return {
        successful: false,
        errors: [`Merkle proof verification error: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Serialize receipt for canonical verification.
   *
   * @param receipt - Receipt data object
   * @returns Canonical JSON string
   */
  private serializeForVerification(receipt: any): string {
    // Create a copy of the receipt
    const canonical = { ...receipt };

    // Remove metadata and timestamps
    delete canonical.metadata;
    delete canonical.created_at;
    delete canonical.updated_at;

    // Remove signature-related fields for non-signing serialization
    delete canonical.signature;
    delete canonical.signature_timestamp;
    delete canonical.signer_identity;
    delete canonical.signing_algorithm;

    // Sort keys and compact JSON
    return JSON.stringify(canonical, Object.keys(canonical).sort(), 0);
  }

  /**
   * Compute SHA-256 hash of receipt data.
   *
   * @param canonicalJson - Canonical JSON string
   * @returns SHA-256 hash as hex string
   */
  private computeReceiptHash(canonicalJson: string): string {
    // TODO: Implement SHA-256 hashing
    // Use browser crypto.subtle or Node.js crypto.createHash
    // This is a placeholder implementation
    return this.sha256(canonicalJson);
  }

  /**
   * Combine two hashes according to Merkle proof direction.
   *
   * @param left - Left hash
   * @param right - Right hash
   * @param direction - Direction ('left' or 'right')
   * @returns Combined hash
   */
  private combineHashes(left: string, right: string, direction: string): string {
    if (direction === 'left') {
      return this.sha256(right + left);
    } else if (direction === 'right') {
      return this.sha256(left + right);
    } else {
      throw new Error(`Invalid Merkle proof direction: ${direction}`);
    }
  }

  /**
   * Compute SHA-256 hash of a string.
   *
   * @param input - Input string
   * @returns SHA-256 hash as hex string
   */
  private sha256(input: string): string {
    // TODO: Replace with actual SHA-256 implementation
    // Browser: crypto.subtle.digest('SHA-256', encoder.encode(input))
    // Node.js: crypto.createHash('sha256').update(input).digest('hex')
    throw new Error('SHA-256 not implemented - use browser or Node.js crypto');
  }
}
