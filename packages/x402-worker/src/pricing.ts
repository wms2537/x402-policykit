/**
 * x402 Pricing utilities
 */

import type { PaywallConfig, EndpointPricing } from './types';

/**
 * Get pricing for an endpoint
 */
export function getPriceForEndpoint(
  endpoint: string,
  config: PaywallConfig
): EndpointPricing | null {
  const pricingEntry = config.pricing[endpoint];

  if (pricingEntry === undefined) {
    // Check for wildcard patterns
    for (const [pattern, price] of Object.entries(config.pricing)) {
      if (matchPattern(endpoint, pattern)) {
        return normalizePricing(price, config);
      }
    }

    // Use default price if set
    if (config.defaultPriceUsd !== undefined) {
      return normalizePricing(config.defaultPriceUsd, config);
    }

    return null;
  }

  return normalizePricing(pricingEntry, config);
}

/**
 * Normalize pricing entry to full EndpointPricing object
 */
function normalizePricing(
  entry: EndpointPricing | number,
  config: PaywallConfig
): EndpointPricing {
  if (typeof entry === 'number') {
    return {
      priceUsd: entry,
      priceToken: usdToToken(entry),
      token: config.defaultToken,
      chainId: config.defaultChainId,
    };
  }
  return entry;
}

/**
 * Simple pattern matching (supports * and ** wildcards)
 */
function matchPattern(path: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '{{DOUBLESTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{DOUBLESTAR}}/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Convert USD to token amount (simplified - assumes USDC at 1:1)
 */
export function usdToToken(usd: number, decimals: number = 6): string {
  const amount = BigInt(Math.round(usd * 10 ** decimals));
  return amount.toString();
}

/**
 * Convert token amount to USD
 */
export function tokenToUsd(amount: string, decimals: number = 6): number {
  const value = BigInt(amount);
  return Number(value) / 10 ** decimals;
}

/**
 * Convert chain ID to CAIP-2 network identifier
 * https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
 */
export function chainIdToCAIP2(chainId: number): string {
  return `eip155:${chainId}`;
}

/**
 * Parse CAIP-2 network identifier to chain ID
 */
export function caip2ToChainId(network: string): number {
  const match = network.match(/^eip155:(\d+)$/);
  if (!match) throw new Error(`Invalid CAIP-2 identifier: ${network}`);
  return parseInt(match[1], 10);
}

/**
 * Create x402 PaymentRequired object (official protocol format)
 */
export function createPaymentRequired(
  pricing: EndpointPricing,
  config: PaywallConfig,
  nonce: string,
  expiry: number,
  resource: string
): PaymentRequired {
  return {
    scheme: pricing.schemes?.[0] ?? 'exact',
    network: chainIdToCAIP2(pricing.chainId),
    maxAmountRequired: pricing.priceToken,
    resource,
    description: pricing.description ?? `Payment of $${pricing.priceUsd.toFixed(4)} USD`,
    mimeType: 'application/json',
    payTo: config.sellerAddress,
    maxTimeoutSeconds: config.expiryDuration ?? 300,
    asset: pricing.token,
    extra: {
      priceUsd: pricing.priceUsd,
      nonce,
      expiry,
    },
  };
}

/**
 * x402 PaymentRequired object structure (official protocol)
 */
export interface PaymentRequired {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    priceUsd?: number;
    nonce?: string;
    expiry?: number;
  };
}

/**
 * Encode PaymentRequired to base64 for PAYMENT-REQUIRED header
 */
export function encodePaymentRequired(pr: PaymentRequired): string {
  return btoa(JSON.stringify(pr));
}

/**
 * Decode PaymentRequired from base64 header
 */
export function decodePaymentRequired(encoded: string): PaymentRequired {
  return JSON.parse(atob(encoded));
}

/**
 * Create 402 Payment Required response (official x402 protocol)
 */
export function create402Response(
  pricing: EndpointPricing,
  config: PaywallConfig,
  nonce: string,
  expiry: number,
  endpoint: string,
  request?: Request
): Response {
  const resource = request ? request.url : endpoint;
  const paymentRequired = createPaymentRequired(pricing, config, nonce, expiry, resource);
  const encodedPR = encodePaymentRequired(paymentRequired);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Official x402 protocol header
    'PAYMENT-REQUIRED': encodedPR,
    // Also include legacy headers for backwards compatibility
    'X-PRICE': pricing.priceToken,
    'X-PRICE-USD': pricing.priceUsd.toString(),
    'X-TOKEN': pricing.token,
    'X-SELLER': config.sellerAddress,
    'X-CHAIN-ID': pricing.chainId.toString(),
    'X-NETWORK': chainIdToCAIP2(pricing.chainId),
    'X-EXPIRY': expiry.toString(),
    'X-NONCE': nonce,
  };

  if (pricing.description) {
    headers['X-DESCRIPTION'] = pricing.description;
  }

  const body = JSON.stringify({
    error: 'Payment Required',
    code: 402,
    paymentRequirements: paymentRequired,
    // Legacy format for backwards compatibility
    payment: {
      price: pricing.priceToken,
      priceUsd: pricing.priceUsd,
      token: pricing.token,
      seller: config.sellerAddress,
      chainId: pricing.chainId,
      network: chainIdToCAIP2(pricing.chainId),
      expiry,
      nonce,
      endpoint,
      description: pricing.description,
    },
    message: `This endpoint requires payment of $${pricing.priceUsd.toFixed(4)} USD`,
  });

  return new Response(body, {
    status: 402,
    statusText: 'Payment Required',
    headers,
  });
}

/**
 * Create a pricing table for catalog endpoint
 */
export function createPricingCatalog(
  config: PaywallConfig
): Array<{
  endpoint: string;
  priceUsd: number;
  description?: string;
}> {
  return Object.entries(config.pricing).map(([endpoint, price]) => {
    const normalized = typeof price === 'number'
      ? { priceUsd: price }
      : price;
    return {
      endpoint,
      priceUsd: normalized.priceUsd,
      description: typeof price === 'object' ? price.description : undefined,
    };
  });
}

/**
 * Calculate total price for multiple endpoints
 */
export function calculateTotalPrice(
  endpoints: string[],
  config: PaywallConfig
): number {
  return endpoints.reduce((total, endpoint) => {
    const pricing = getPriceForEndpoint(endpoint, config);
    return total + (pricing?.priceUsd ?? 0);
  }, 0);
}
