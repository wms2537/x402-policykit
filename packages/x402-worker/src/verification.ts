/**
 * x402 Payment Verification
 */

import type { ParsedPayment, EndpointPricing, PaywallConfig } from './types';

export interface VerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Parse X-PAYMENT header
 */
export function parsePaymentHeader(header: string): ParsedPayment | null {
  try {
    const decoded = atob(header);
    const payload = JSON.parse(decoded);

    if (!payload.sig || !payload.payer || !payload.nonce) {
      return null;
    }

    return {
      signature: payload.sig,
      payer: payload.payer,
      nonce: payload.nonce,
      expiry: payload.expiry,
      amount: payload.amount,
      token: payload.token,
      chainId: payload.chainId,
      txHash: payload.txHash,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a payment meets requirements
 */
export async function verifyPayment(
  payment: ParsedPayment,
  pricing: EndpointPricing,
  config: PaywallConfig
): Promise<VerificationResult> {
  // Check expiry
  if (payment.expiry < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'Payment has expired' };
  }

  // Check token matches
  if (payment.token.toLowerCase() !== pricing.token.toLowerCase()) {
    return { valid: false, reason: 'Token mismatch' };
  }

  // Check chain matches
  if (payment.chainId !== pricing.chainId) {
    return { valid: false, reason: 'Chain ID mismatch' };
  }

  // Check amount is sufficient
  const paymentAmount = BigInt(payment.amount);
  const requiredAmount = BigInt(pricing.priceToken);
  if (paymentAmount < requiredAmount) {
    return { valid: false, reason: 'Insufficient payment amount' };
  }

  // Verify signature (if configured)
  if (config.verifySignatures) {
    const signatureValid = await verifySignature(payment, config.sellerAddress);
    if (!signatureValid) {
      return { valid: false, reason: 'Invalid signature' };
    }
  }

  return { valid: true };
}

/**
 * Verify payment signature
 * This is a simplified version - in production you'd use proper crypto
 */
async function verifySignature(
  payment: ParsedPayment,
  _expectedSeller: string
): Promise<boolean> {
  // In a real implementation, you would:
  // 1. Reconstruct the message that was signed
  // 2. Recover the signer address from the signature
  // 3. Verify it matches the payer address
  // 4. Possibly verify the seller address matches

  // For now, we do basic format checking
  if (!payment.signature || payment.signature.length < 130) {
    return false;
  }

  // Check signature format (0x prefix + 130 hex chars for ECDSA)
  if (!payment.signature.startsWith('0x')) {
    return false;
  }

  return true;
}

/**
 * Create a message to be signed for payment
 */
export function createPaymentMessage(params: {
  seller: string;
  amount: string;
  token: string;
  chainId: number;
  nonce: string;
  expiry: number;
}): string {
  return JSON.stringify({
    seller: params.seller.toLowerCase(),
    amount: params.amount,
    token: params.token.toLowerCase(),
    chainId: params.chainId,
    nonce: params.nonce,
    expiry: params.expiry,
  });
}

/**
 * Hash a message for signing (keccak256-like, simplified)
 */
export function hashMessage(message: string): string {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Check if an address is valid (basic check)
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}
