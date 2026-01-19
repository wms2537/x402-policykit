/**
 * x402 Paywall Worker
 * Paid Tools Gateway with 402 Payment Required responses
 */

import { withX402Paywall, createPaywallRouter, createPricingCatalog } from '@x402/worker';
import type { PaywallConfig, PaywallContext } from '@x402/worker';

// Environment bindings
interface Env {
  DB: D1Database;
  NONCES: KVNamespace;
  SELLER_ADDRESS: string;
  DEFAULT_TOKEN: string;
  DEFAULT_CHAIN_ID: string;
}

// Paywall configuration
function getPaywallConfig(env: Env): PaywallConfig {
  return {
    sellerAddress: env.SELLER_ADDRESS,
    defaultToken: env.DEFAULT_TOKEN,
    defaultChainId: parseInt(env.DEFAULT_CHAIN_ID, 10),
    pricing: {
      '/tool/extract': {
        priceUsd: 0.05,
        priceToken: '50000', // 0.05 USDC (6 decimals)
        token: env.DEFAULT_TOKEN,
        chainId: parseInt(env.DEFAULT_CHAIN_ID, 10),
        description: 'Extract structured data from content',
      },
      '/tool/quote': {
        priceUsd: 0.03,
        priceToken: '30000',
        token: env.DEFAULT_TOKEN,
        chainId: parseInt(env.DEFAULT_CHAIN_ID, 10),
        description: 'Generate a price quote for a task',
      },
      '/tool/verify': {
        priceUsd: 0.02,
        priceToken: '20000',
        token: env.DEFAULT_TOKEN,
        chainId: parseInt(env.DEFAULT_CHAIN_ID, 10),
        description: 'Verify data integrity and authenticity',
      },
    },
    expiryDuration: 300, // 5 minutes
    checkReplay: true,
    db: env.DB,
    kv: env.NONCES,
  };
}

// Tool handlers
async function handleExtract(
  request: Request,
  _env: Env,
  _ctx: ExecutionContext,
  paywall: PaywallContext
): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { content?: string };
  const content = body.content || 'No content provided';

  // Simulate extraction
  const extracted = {
    entities: extractEntities(content),
    keywords: extractKeywords(content),
    summary: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
  };

  return Response.json({
    success: true,
    result: extracted,
    meta: {
      paid: paywall.paid,
      receiptId: paywall.receiptId,
      priceUsd: paywall.priceUsd,
    },
  });
}

async function handleQuote(
  request: Request,
  _env: Env,
  _ctx: ExecutionContext,
  paywall: PaywallContext
): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { task?: string; complexity?: string };
  const task = body.task || 'Unknown task';
  const complexity = body.complexity || 'medium';

  // Simulate quote generation
  const basePrice = complexity === 'high' ? 0.50 : complexity === 'low' ? 0.10 : 0.25;
  const quote = {
    task,
    complexity,
    estimatedPrice: basePrice,
    currency: 'USD',
    validFor: '24 hours',
    breakdown: {
      compute: basePrice * 0.6,
      storage: basePrice * 0.2,
      network: basePrice * 0.2,
    },
  };

  return Response.json({
    success: true,
    result: quote,
    meta: {
      paid: paywall.paid,
      receiptId: paywall.receiptId,
      priceUsd: paywall.priceUsd,
    },
  });
}

async function handleVerify(
  request: Request,
  _env: Env,
  _ctx: ExecutionContext,
  paywall: PaywallContext
): Promise<Response> {
  const body = await request.json().catch(() => ({})) as { data?: string; hash?: string };
  const data = body.data || '';
  const providedHash = body.hash || '';

  // Simulate verification
  const computedHash = simpleHash(data);
  const verified = providedHash ? computedHash === providedHash : true;

  return Response.json({
    success: true,
    result: {
      verified,
      hash: computedHash,
      timestamp: new Date().toISOString(),
      algorithm: 'djb2',
    },
    meta: {
      paid: paywall.paid,
      receiptId: paywall.receiptId,
      priceUsd: paywall.priceUsd,
    },
  });
}

// Catalog handler (free)
async function handleCatalog(env: Env): Promise<Response> {
  const config = getPaywallConfig(env);
  const catalog = createPricingCatalog(config);

  return Response.json({
    name: 'x402 Paid Tools API',
    version: '1.0.0',
    seller: config.sellerAddress,
    chainId: config.defaultChainId,
    token: config.defaultToken,
    tools: catalog,
    documentation: 'https://github.com/your-org/x402-policykit',
  });
}

// Health check (free)
async function handleHealth(): Promise<Response> {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

// Main fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const config = getPaywallConfig(env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    // Route handling
    let response: Response;

    switch (url.pathname) {
      case '/':
      case '/health':
        response = await handleHealth();
        break;

      case '/catalog':
        response = await handleCatalog(env);
        break;

      case '/tool/extract':
        if (request.method !== 'POST') {
          response = new Response('Method not allowed', { status: 405 });
        } else {
          const handler = withX402Paywall(handleExtract, config);
          response = await handler(request, env, ctx);
        }
        break;

      case '/tool/quote':
        if (request.method !== 'POST') {
          response = new Response('Method not allowed', { status: 405 });
        } else {
          const handler = withX402Paywall(handleQuote, config);
          response = await handler(request, env, ctx);
        }
        break;

      case '/tool/verify':
        if (request.method !== 'POST') {
          response = new Response('Method not allowed', { status: 405 });
        } else {
          const handler = withX402Paywall(handleVerify, config);
          response = await handler(request, env, ctx);
        }
        break;

      default:
        response = new Response(
          JSON.stringify({ error: 'Not Found', path: url.pathname }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Add CORS headers
    return addCorsHeaders(response);
  },
};

// CORS handling
function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-PAYMENT',
      'Access-Control-Expose-Headers': 'X-RECEIPT-ID, X-PRICE, X-PRICE-USD, X-TOKEN, X-SELLER, X-CHAIN-ID, X-EXPIRY, X-NONCE',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', 'X-RECEIPT-ID, X-PRICE, X-PRICE-USD, X-TOKEN, X-SELLER, X-CHAIN-ID, X-EXPIRY, X-NONCE');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Helper functions
function extractEntities(text: string): string[] {
  // Simple entity extraction (capitalized words)
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  return [...new Set(matches || [])].slice(0, 10);
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction (common words filtered)
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just']);

  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const filtered = words.filter(w => !stopWords.has(w));
  const counts = new Map<string, number>();

  for (const word of filtered) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
