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
 * Create 402 Payment Required response
 */
export function create402Response(
  pricing: EndpointPricing,
  config: PaywallConfig,
  nonce: string,
  expiry: number,
  endpoint: string
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-PRICE': pricing.priceToken,
    'X-PRICE-USD': pricing.priceUsd.toString(),
    'X-TOKEN': pricing.token,
    'X-SELLER': config.sellerAddress,
    'X-CHAIN-ID': pricing.chainId.toString(),
    'X-EXPIRY': expiry.toString(),
    'X-NONCE': nonce,
  };

  if (pricing.description) {
    headers['X-DESCRIPTION'] = pricing.description;
  }

  if (pricing.schemes) {
    headers['X-SCHEMES'] = pricing.schemes.join(',');
  }

  const body = JSON.stringify({
    error: 'Payment Required',
    code: 402,
    payment: {
      price: pricing.priceToken,
      priceUsd: pricing.priceUsd,
      token: pricing.token,
      seller: config.sellerAddress,
      chainId: pricing.chainId,
      expiry,
      nonce,
      endpoint,
      description: pricing.description,
      schemes: pricing.schemes,
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
