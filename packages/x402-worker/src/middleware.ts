/**
 * x402 Paywall Middleware
 * Core middleware for protecting Cloudflare Worker routes
 */

import { createContentHash } from '@x402/policy-engine';
import type {
  PaywallConfig,
  PaywallContext,
  WorkerHandler,
  ParsedPayment,
} from './types';
import { generateNonce, generateReceiptId } from './types';
import { getPriceForEndpoint, create402Response } from './pricing';
import { parsePaymentHeader, verifyPayment } from './verification';
import { storeReceipt } from './receipts';

/**
 * Create a paywall-protected handler
 *
 * @example
 * ```typescript
 * const handler = withX402Paywall(
 *   async (request, env, ctx, paywall) => {
 *     // Your handler logic here
 *     return new Response(JSON.stringify({ result: 'success' }));
 *   },
 *   {
 *     sellerAddress: '0x...',
 *     defaultToken: '0x...',
 *     defaultChainId: 84532,
 *     pricing: {
 *       '/tool/extract': 0.05,
 *       '/tool/quote': 0.03,
 *     },
 *   }
 * );
 * ```
 */
export function withX402Paywall<Env = unknown>(
  handler: WorkerHandler<Env>,
  config: PaywallConfig
): (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> {
  return async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    const url = new URL(request.url);
    const endpoint = url.pathname;

    // Get pricing for this endpoint
    const pricing = getPriceForEndpoint(endpoint, config);
    if (!pricing) {
      // No pricing = free endpoint, pass through
      const paywallCtx: PaywallContext = {
        paid: false,
        priceUsd: 0,
        nonce: '',
      };
      return handler(request, env, ctx, paywallCtx);
    }

    // Generate nonce for this request
    const nonce = generateNonce();
    const expiry = Math.floor(Date.now() / 1000) + (config.expiryDuration ?? 300);

    // Check for payment header (support both official and legacy headers)
    const paymentHeader = request.headers.get('PAYMENT-SIGNATURE')
      || request.headers.get('X-PAYMENT');

    if (!paymentHeader) {
      // No payment - return 402 with official x402 protocol headers
      return create402Response(pricing, config, nonce, expiry, endpoint, request);
    }

    // Parse payment
    const payment = parsePaymentHeader(paymentHeader);
    if (!payment) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment header format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify payment
    const verification = await verifyPayment(payment, pricing, config);
    if (!verification.valid) {
      return new Response(
        JSON.stringify({ error: verification.reason }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            ...create402Headers(pricing, config, nonce, expiry),
          },
        }
      );
    }

    // Check for replay (if configured)
    if (config.checkReplay && config.kv) {
      const used = await config.kv.get(`nonce:${payment.nonce}`);
      if (used) {
        return new Response(
          JSON.stringify({ error: 'Payment nonce already used' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Mark nonce as used
      await config.kv.put(`nonce:${payment.nonce}`, '1', {
        expirationTtl: 86400, // 24 hours
      });
    }

    // Payment is valid - execute handler
    const receiptId = generateReceiptId();
    const paywallCtx: PaywallContext = {
      paid: true,
      payment,
      receiptId,
      priceUsd: pricing.priceUsd,
      nonce: payment.nonce,
    };

    // Hash request for receipt
    const requestBody = await request.clone().text();
    const requestHash = createContentHash({
      method: request.method,
      url: request.url,
      body: requestBody,
    });

    // Execute the handler
    const response = await handler(request, env, ctx, paywallCtx);

    // Hash response for receipt
    const responseBody = await response.clone().text();
    const responseHash = createContentHash({
      status: response.status,
      body: responseBody,
    });

    // Store receipt (async, don't block response)
    if (config.db) {
      ctx.waitUntil(
        storeReceipt(config.db, {
          id: receiptId,
          callId: nonce,
          paymentRef: payment.signature.slice(0, 32),
          amountUsd: pricing.priceUsd,
          token: payment.token,
          chainId: payment.chainId,
          seller: config.sellerAddress,
          buyer: payment.payer,
          nonce: payment.nonce,
          expiry: new Date(payment.expiry * 1000).toISOString(),
          signature: payment.signature,
          requestHash,
          responseHash,
          txHash: payment.txHash,
          verified: verification.valid,
          createdAt: new Date().toISOString(),
        })
      );
    }

    // Add receipt ID and payment response to headers
    const headers = new Headers(response.headers);
    headers.set('X-RECEIPT-ID', receiptId);

    // Add official x402 PAYMENT-RESPONSE header
    const paymentResponse = {
      success: true,
      receiptId,
      network: `eip155:${payment.chainId}`,
      txHash: payment.txHash,
      settledAt: new Date().toISOString(),
    };
    headers.set('PAYMENT-RESPONSE', btoa(JSON.stringify(paymentResponse)));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Create 402 headers object (includes both official and legacy headers)
 */
function create402Headers(
  pricing: { priceUsd: number; priceToken: string; token: string; chainId: number; description?: string; schemes?: string[] },
  config: PaywallConfig,
  nonce: string,
  expiry: number
): Record<string, string> {
  // Create PaymentRequired object for official header
  const paymentRequired = {
    scheme: pricing.schemes?.[0] ?? 'exact',
    network: `eip155:${pricing.chainId}`,
    maxAmountRequired: pricing.priceToken,
    payTo: config.sellerAddress,
    maxTimeoutSeconds: config.expiryDuration ?? 300,
    asset: pricing.token,
    extra: { priceUsd: pricing.priceUsd, nonce, expiry },
  };

  return {
    // Official x402 protocol header
    'PAYMENT-REQUIRED': btoa(JSON.stringify(paymentRequired)),
    // Legacy headers for backwards compatibility
    'X-PRICE': pricing.priceToken,
    'X-PRICE-USD': pricing.priceUsd.toString(),
    'X-TOKEN': pricing.token,
    'X-SELLER': config.sellerAddress,
    'X-CHAIN-ID': pricing.chainId.toString(),
    'X-NETWORK': `eip155:${pricing.chainId}`,
    'X-EXPIRY': expiry.toString(),
    'X-NONCE': nonce,
    ...(pricing.description && { 'X-DESCRIPTION': pricing.description }),
    ...(pricing.schemes && { 'X-SCHEMES': pricing.schemes.join(',') }),
  };
}

/**
 * Simple route matcher for paywall
 */
export function createPaywallRouter<Env = unknown>(config: PaywallConfig) {
  const routes: Map<string, WorkerHandler<Env>> = new Map();

  return {
    /**
     * Add a paid route
     */
    paid(pattern: string, handler: WorkerHandler<Env>) {
      routes.set(pattern, withX402Paywall(handler, config));
      return this;
    },

    /**
     * Add a free route
     */
    free(pattern: string, handler: (request: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response>) {
      routes.set(pattern, (req, env, ctx, _paywall) => handler(req, env, ctx));
      return this;
    },

    /**
     * Handle a request
     */
    async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);
      const handler = routes.get(url.pathname);

      if (!handler) {
        return new Response('Not Found', { status: 404 });
      }

      // For paid routes, paywall context is injected by middleware
      // For free routes, we pass a dummy context
      const paywallCtx: PaywallContext = {
        paid: false,
        priceUsd: 0,
        nonce: '',
      };

      return handler(request, env, ctx, paywallCtx);
    },
  };
}
