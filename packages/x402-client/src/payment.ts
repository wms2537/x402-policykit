/**
 * x402 Payment utilities
 * Parsing and creating payment headers
 */

import type { X402Headers, PaymentProof } from './types';

/**
 * Parse 402 response headers into X402Headers object
 */
export function parse402Headers(response: Response): X402Headers | null {
  const price = response.headers.get('X-PRICE');
  const priceUsd = response.headers.get('X-PRICE-USD');
  const token = response.headers.get('X-TOKEN');
  const seller = response.headers.get('X-SELLER');
  const chainId = response.headers.get('X-CHAIN-ID');
  const expiry = response.headers.get('X-EXPIRY');
  const nonce = response.headers.get('X-NONCE');

  // Required fields
  if (!price || !token || !seller || !chainId || !expiry || !nonce) {
    return null;
  }

  return {
    price,
    priceUsd: priceUsd ? parseFloat(priceUsd) : 0,
    token,
    seller,
    chainId: parseInt(chainId, 10),
    expiry: parseInt(expiry, 10),
    nonce,
    description: response.headers.get('X-DESCRIPTION') || undefined,
    schemes: response.headers.get('X-SCHEMES')?.split(',').map(s => s.trim()) || undefined,
  };
}

/**
 * Create X-PAYMENT header value from payment proof
 */
export function createPaymentHeader(proof: PaymentProof): string {
  const payload = {
    sig: proof.signature,
    payer: proof.payer,
    nonce: proof.nonce,
    expiry: proof.expiry,
    amount: proof.amount,
    token: proof.token,
    chainId: proof.chainId,
    ...(proof.txHash && { txHash: proof.txHash }),
  };

  return btoa(JSON.stringify(payload));
}

/**
 * Parse X-PAYMENT header value
 */
export function parsePaymentHeader(header: string): PaymentProof | null {
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
 * Verify payment hasn't expired
 */
export function isPaymentExpired(expiry: number): boolean {
  return Date.now() > expiry * 1000;
}

/**
 * Calculate time until expiry in seconds
 */
export function secondsUntilExpiry(expiry: number): number {
  return Math.max(0, expiry - Math.floor(Date.now() / 1000));
}

/**
 * Simple mock wallet for testing
 */
export function createMockWallet(privateKey: string = 'test') {
  const address = `0x${privateKey.slice(0, 40).padStart(40, '0')}`;

  return {
    async getAddress() {
      return address;
    },

    async signPayment(params: {
      seller: string;
      amount: string;
      token: string;
      chainId: number;
      nonce: string;
      expiry: number;
    }) {
      // Create a deterministic mock signature
      const message = JSON.stringify(params);
      const hash = simpleHash(message);
      return `0x${hash}${'0'.repeat(130 - hash.length)}`;
    },
  };
}

/**
 * Simple hash function for mock purposes
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Format price for display
 */
export function formatPrice(priceUsd: number): string {
  if (priceUsd >= 1) {
    return `$${priceUsd.toFixed(2)}`;
  } else if (priceUsd >= 0.01) {
    return `$${priceUsd.toFixed(3)}`;
  } else {
    return `$${priceUsd.toFixed(4)}`;
  }
}

/**
 * Convert token amount to USD (simplified)
 */
export function tokenToUsd(
  amount: string,
  tokenDecimals: number,
  tokenPriceUsd: number
): number {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** tokenDecimals);
  const tokenAmount = Number(value) / Number(divisor);
  return tokenAmount * tokenPriceUsd;
}
