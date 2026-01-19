/**
 * x402 Client Types
 * Types for the x402 fetch wrapper and payment handling
 */

import type { Policy, PolicyDecision, SpendContext } from '@x402/policy-engine';

/**
 * x402 Protocol Headers (from 402 response)
 */
export interface X402Headers {
  /** Price in smallest token unit (e.g., wei) */
  price: string;
  /** Price in USD */
  priceUsd: number;
  /** Token contract address */
  token: string;
  /** Seller/payee address */
  seller: string;
  /** Chain ID */
  chainId: number;
  /** Payment expiry timestamp */
  expiry: number;
  /** Unique payment nonce */
  nonce: string;
  /** Payment description */
  description?: string;
  /** Supported payment schemes */
  schemes?: string[];
}

/**
 * Payment proof to include in retry request
 */
export interface PaymentProof {
  /** Signed authorization or transaction hash */
  signature: string;
  /** Payer address */
  payer: string;
  /** Payment nonce (must match 402 response) */
  nonce: string;
  /** Expiry timestamp */
  expiry: number;
  /** Amount paid */
  amount: string;
  /** Token address */
  token: string;
  /** Chain ID */
  chainId: number;
  /** Optional transaction hash if on-chain */
  txHash?: string;
}

/**
 * x402Fetch options
 */
export interface X402FetchOptions {
  /** Policy to evaluate against */
  policy: Policy;
  /** Wallet/signer for payments */
  wallet: WalletAdapter;
  /** Storage for spend tracking */
  storage?: SpendStorage;
  /** Caller identifier */
  callerId: string;
  /** Whether to auto-pay on 402 (default: true if policy allows) */
  autoPay?: boolean;
  /** Callback when payment is required */
  onPaymentRequired?: (headers: X402Headers, decision: PolicyDecision) => void;
  /** Callback when payment is made */
  onPaymentMade?: (proof: PaymentProof) => void;
  /** Callback when policy blocks payment */
  onPolicyBlocked?: (decision: PolicyDecision) => void;
  /** Maximum retries after payment */
  maxRetries?: number;
}

/**
 * Wallet adapter interface
 */
export interface WalletAdapter {
  /** Get wallet address */
  getAddress(): Promise<string>;
  /** Sign a payment authorization */
  signPayment(params: {
    seller: string;
    amount: string;
    token: string;
    chainId: number;
    nonce: string;
    expiry: number;
  }): Promise<string>;
  /** Optional: submit on-chain payment */
  submitPayment?(params: {
    seller: string;
    amount: string;
    token: string;
    chainId: number;
  }): Promise<string>; // returns tx hash
}

/**
 * Spend storage interface for tracking
 */
export interface SpendStorage {
  /** Get current spend context for a caller */
  getSpendContext(callerId: string): Promise<SpendContext>;
  /** Record a payment */
  recordPayment(
    callerId: string,
    amountUsd: number,
    metadata: {
      endpoint: string;
      nonce: string;
      paymentRef: string;
    }
  ): Promise<void>;
  /** Record a policy decision */
  recordDecision(
    callerId: string,
    decision: PolicyDecision,
    metadata: {
      endpoint: string;
      priceUsd: number;
    }
  ): Promise<void>;
}

/**
 * x402 Response with additional metadata
 */
export interface X402Response extends Response {
  /** Whether payment was made */
  x402Paid: boolean;
  /** Payment details if paid */
  x402Payment?: PaymentProof;
  /** Policy decision */
  x402Decision?: PolicyDecision;
  /** Receipt ID from server */
  x402ReceiptId?: string;
}

/**
 * 402 Error when policy blocks payment
 */
export class X402PolicyError extends Error {
  constructor(
    message: string,
    public decision: PolicyDecision,
    public headers: X402Headers
  ) {
    super(message);
    this.name = 'X402PolicyError';
  }
}

/**
 * 402 Error when payment fails
 */
export class X402PaymentError extends Error {
  constructor(
    message: string,
    public headers: X402Headers,
    public cause?: Error
  ) {
    super(message);
    this.name = 'X402PaymentError';
  }
}
