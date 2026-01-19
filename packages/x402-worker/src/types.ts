/**
 * x402 Worker Types
 */

import { generateId } from '@x402/policy-engine';

/**
 * Pricing configuration for an endpoint
 */
export interface EndpointPricing {
  /** Price in USD */
  priceUsd: number;
  /** Price in token smallest units (e.g., wei) */
  priceToken: string;
  /** Token contract address */
  token: string;
  /** Chain ID */
  chainId: number;
  /** Human-readable description */
  description?: string;
  /** Supported payment schemes */
  schemes?: string[];
}

/**
 * Paywall configuration
 */
export interface PaywallConfig {
  /** Seller/payee address */
  sellerAddress: string;
  /** Default token address */
  defaultToken: string;
  /** Default chain ID */
  defaultChainId: number;
  /** Pricing by endpoint pattern */
  pricing: Record<string, EndpointPricing | number>;
  /** Default price if endpoint not in pricing */
  defaultPriceUsd?: number;
  /** Payment expiry duration in seconds */
  expiryDuration?: number;
  /** Optional: verify payments cryptographically */
  verifySignatures?: boolean;
  /** Optional: check for replay attacks */
  checkReplay?: boolean;
  /** Optional: D1 database for receipts */
  db?: D1Database;
  /** Optional: KV namespace for nonces */
  kv?: KVNamespace;
}

/**
 * Parsed payment from X-PAYMENT header
 */
export interface ParsedPayment {
  signature: string;
  payer: string;
  nonce: string;
  expiry: number;
  amount: string;
  token: string;
  chainId: number;
  txHash?: string;
}

/**
 * Receipt stored after successful payment
 */
export interface Receipt {
  id: string;
  callId: string;
  paymentRef: string;
  amountUsd: number;
  token: string;
  chainId: number;
  seller: string;
  buyer: string;
  nonce: string;
  expiry: string;
  signature: string;
  requestHash: string;
  responseHash: string;
  txHash?: string;
  verified: boolean;
  createdAt: string;
}

/**
 * Context passed to wrapped handlers
 */
export interface PaywallContext {
  /** Whether this request was paid */
  paid: boolean;
  /** Payment details if paid */
  payment?: ParsedPayment;
  /** Generated receipt ID */
  receiptId?: string;
  /** Price that was/would be charged */
  priceUsd: number;
  /** Nonce for this request */
  nonce: string;
}

/**
 * Handler function type for Worker routes
 */
export type WorkerHandler<Env = unknown> = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  paywall: PaywallContext
) => Response | Promise<Response>;

/**
 * Generate a unique nonce
 */
export function generateNonce(): string {
  return generateId('nonce');
}

/**
 * Generate a receipt ID
 */
export function generateReceiptId(): string {
  return generateId('rcpt');
}

// Type stubs for Cloudflare bindings
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
  }
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T>(): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T>(): Promise<D1Result<T>>;
  }
  interface D1Result<T = unknown> {
    results?: T[];
    success: boolean;
    error?: string;
  }
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  }
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}
