/**
 * x402 Policy Engine Types
 * JSON-first policy DSL for agent spending control
 */

/**
 * Policy configuration - the main configuration object
 */
export interface Policy {
  /** Unique identifier for this policy */
  id: string;
  /** Human-readable name */
  name: string;
  /** Maximum daily spend in USD */
  dailyCapUsd: number;
  /** Maximum weekly spend in USD */
  weeklyCapUsd?: number;
  /** Maximum per-call spend in USD */
  perCallCapUsd: number;
  /** Allowed tool/endpoint names (empty = allow all) */
  allowTools: string[];
  /** Denied tool/endpoint names (takes precedence over allowTools) */
  denyTools?: string[];
  /** Allowed domains (empty = allow all) */
  allowDomains?: string[];
  /** Denied domains (takes precedence over allowDomains) */
  denyDomains?: string[];
  /** Per-endpoint custom caps */
  endpointCaps?: Record<string, number>;
  /** Whether policy is active */
  enabled: boolean;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Spend context - current spending state for evaluation
 */
export interface SpendContext {
  /** Caller/agent identifier */
  callerId: string;
  /** Total spent today in USD */
  dailySpentUsd: number;
  /** Total spent this week in USD */
  weeklySpentUsd: number;
  /** Number of calls today */
  dailyCallCount: number;
  /** Timestamp of context */
  timestamp: Date;
}

/**
 * Payment request - incoming request to evaluate
 */
export interface PaymentRequest {
  /** Endpoint being called */
  endpoint: string;
  /** Tool name (extracted from endpoint) */
  tool: string;
  /** Domain of the endpoint */
  domain: string;
  /** Price in USD */
  priceUsd: number;
  /** Caller identifier */
  callerId: string;
  /** Optional request metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Policy decision - the result of evaluation
 */
export interface PolicyDecision {
  /** Whether the payment is allowed */
  allow: boolean;
  /** Human-readable reason for the decision */
  reason: string;
  /** Which rule triggered the decision */
  ruleId: string;
  /** Projected total spend after this payment */
  projectedSpend: number;
  /** Current daily spend before this payment */
  currentDailySpend: number;
  /** Current weekly spend before this payment */
  currentWeeklySpend: number;
  /** Remaining daily budget after this payment (if allowed) */
  remainingDailyBudget: number;
  /** Remaining weekly budget after this payment (if allowed) */
  remainingWeeklyBudget?: number;
  /** Policy ID that was evaluated */
  policyId: string;
  /** Timestamp of decision */
  timestamp: Date;
  /** Full trace of rules evaluated */
  trace: RuleTrace[];
}

/**
 * Rule trace - details of each rule evaluation
 */
export interface RuleTrace {
  /** Rule identifier */
  ruleId: string;
  /** Rule name */
  ruleName: string;
  /** Whether rule passed */
  passed: boolean;
  /** Reason for pass/fail */
  reason: string;
  /** Values compared (for debugging) */
  values?: Record<string, unknown>;
}

/**
 * Default policy for new users/agents
 */
export const DEFAULT_POLICY: Policy = {
  id: 'default',
  name: 'Default Policy',
  dailyCapUsd: 1.0,
  weeklyCapUsd: 5.0,
  perCallCapUsd: 0.10,
  allowTools: [],
  denyTools: [],
  allowDomains: [],
  denyDomains: [],
  endpointCaps: {},
  enabled: true,
};

/**
 * Empty spend context for new callers
 */
export const EMPTY_SPEND_CONTEXT: Omit<SpendContext, 'callerId' | 'timestamp'> = {
  dailySpentUsd: 0,
  weeklySpentUsd: 0,
  dailyCallCount: 0,
};
