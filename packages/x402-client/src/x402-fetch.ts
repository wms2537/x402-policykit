/**
 * x402Fetch - Main fetch wrapper with 402 handling
 */

import {
  evaluatePolicy,
  parsePaymentRequest,
  createSpendContext,
  generateId,
} from '@x402/policy-engine';
import type {
  X402FetchOptions,
  X402Headers,
  X402Response,
  PaymentProof,
  SpendStorage,
} from './types';
import { X402PolicyError, X402PaymentError } from './types';
import { parse402Headers, createPaymentHeader } from './payment';
import { InMemorySpendStorage } from './storage';

// Default storage instance
let defaultStorage: SpendStorage | null = null;

/**
 * Get or create default in-memory storage
 */
function getDefaultStorage(): SpendStorage {
  if (!defaultStorage) {
    defaultStorage = new InMemorySpendStorage();
  }
  return defaultStorage;
}

/**
 * x402Fetch - Fetch wrapper that handles 402 Payment Required responses
 *
 * @example
 * ```typescript
 * const response = await x402Fetch('https://api.example.com/tool/extract', {
 *   method: 'POST',
 *   body: JSON.stringify({ data: 'test' }),
 * }, {
 *   policy: myPolicy,
 *   wallet: myWallet,
 *   callerId: 'agent-123',
 * });
 * ```
 */
export async function x402Fetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: X402FetchOptions
): Promise<X402Response> {
  const {
    policy,
    wallet,
    storage = getDefaultStorage(),
    callerId,
    autoPay = true,
    onPaymentRequired,
    onPaymentMade,
    onPolicyBlocked,
    maxRetries = 1,
  } = options;

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  // Make initial request
  let response = await fetch(input, init);

  // If not 402, return immediately
  if (response.status !== 402) {
    const x402Response = response as X402Response;
    x402Response.x402Paid = false;
    return x402Response;
  }

  // Parse 402 headers
  const headers = parse402Headers(response);
  if (!headers) {
    throw new X402PaymentError('Invalid 402 response - missing required headers', {
      price: '0',
      priceUsd: 0,
      token: '',
      seller: '',
      chainId: 0,
      expiry: 0,
      nonce: '',
    });
  }

  // Get current spend context
  const context = await storage.getSpendContext(callerId);

  // Create payment request for policy evaluation
  const paymentRequest = parsePaymentRequest(url, headers.priceUsd, callerId);

  // Evaluate policy
  const decision = evaluatePolicy(policy, paymentRequest, context, { fullTrace: true });

  // Record the decision
  await storage.recordDecision(callerId, decision, {
    endpoint: paymentRequest.endpoint,
    priceUsd: headers.priceUsd,
  });

  // Notify about 402
  onPaymentRequired?.(headers, decision);

  // If policy blocks, throw or return based on autoPay setting
  if (!decision.allow) {
    onPolicyBlocked?.(decision);
    throw new X402PolicyError(
      `Payment blocked by policy: ${decision.reason}`,
      decision,
      headers
    );
  }

  // If autoPay is disabled, throw
  if (!autoPay) {
    throw new X402PolicyError(
      'Payment required but autoPay is disabled',
      decision,
      headers
    );
  }

  // Generate payment
  let paymentProof: PaymentProof;
  try {
    const signature = await wallet.signPayment({
      seller: headers.seller,
      amount: headers.price,
      token: headers.token,
      chainId: headers.chainId,
      nonce: headers.nonce,
      expiry: headers.expiry,
    });

    paymentProof = {
      signature,
      payer: await wallet.getAddress(),
      nonce: headers.nonce,
      expiry: headers.expiry,
      amount: headers.price,
      token: headers.token,
      chainId: headers.chainId,
    };
  } catch (error) {
    throw new X402PaymentError(
      'Failed to generate payment',
      headers,
      error instanceof Error ? error : undefined
    );
  }

  // Notify about payment
  onPaymentMade?.(paymentProof);

  // Retry with payment header
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < maxRetries) {
    try {
      const paymentHeader = createPaymentHeader(paymentProof);

      response = await fetch(input, {
        ...init,
        headers: {
          ...init.headers,
          // Official x402 protocol header
          'PAYMENT-SIGNATURE': paymentHeader,
          // Legacy header for backwards compatibility
          'X-PAYMENT': paymentHeader,
        },
      });

      // Record successful payment
      if (response.ok) {
        await storage.recordPayment(callerId, headers.priceUsd, {
          endpoint: paymentRequest.endpoint,
          nonce: headers.nonce,
          paymentRef: paymentProof.signature.slice(0, 16),
        });
      }

      const x402Response = response as X402Response;
      x402Response.x402Paid = true;
      x402Response.x402Payment = paymentProof;
      x402Response.x402Decision = decision;
      x402Response.x402ReceiptId = response.headers.get('X-RECEIPT-ID') || undefined;

      return x402Response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryCount++;
    }
  }

  throw new X402PaymentError(
    `Payment request failed after ${maxRetries} retries`,
    headers,
    lastError || undefined
  );
}

/**
 * Create a configured x402Fetch instance
 */
export function createX402Client(defaultOptions: Partial<X402FetchOptions>) {
  return {
    fetch: async (
      input: RequestInfo | URL,
      init: RequestInit = {},
      options: Partial<X402FetchOptions> = {}
    ): Promise<X402Response> => {
      const mergedOptions = {
        ...defaultOptions,
        ...options,
      } as X402FetchOptions;

      if (!mergedOptions.policy) {
        throw new Error('Policy is required');
      }
      if (!mergedOptions.wallet) {
        throw new Error('Wallet is required');
      }
      if (!mergedOptions.callerId) {
        throw new Error('Caller ID is required');
      }

      return x402Fetch(input, init, mergedOptions);
    },

    /**
     * Check if a URL would require payment (HEAD request)
     */
    checkPaymentRequired: async (url: string): Promise<X402Headers | null> => {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.status === 402) {
        return parse402Headers(response);
      }
      return null;
    },

    /**
     * Get current spend context
     */
    getSpendContext: async () => {
      const storage = defaultOptions.storage || getDefaultStorage();
      const callerId = defaultOptions.callerId;
      if (!callerId) {
        throw new Error('Caller ID is required');
      }
      return storage.getSpendContext(callerId);
    },
  };
}
