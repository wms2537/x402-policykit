/**
 * x402 Policy Evaluator
 * Main evaluation logic for policy decisions
 */

import type { Policy, SpendContext, PaymentRequest, PolicyDecision, RuleTrace } from './types';
import { ALL_RULES, type RuleFunction } from './rules';
import { DEFAULT_POLICY, EMPTY_SPEND_CONTEXT } from './types';

export interface EvaluatorOptions {
  /** Custom rules to use instead of defaults */
  rules?: RuleFunction[];
  /** Whether to continue evaluation after first failure (for full trace) */
  fullTrace?: boolean;
}

/**
 * Evaluate a payment request against a policy
 */
export function evaluatePolicy(
  policy: Policy,
  request: PaymentRequest,
  context: SpendContext,
  options: EvaluatorOptions = {}
): PolicyDecision {
  const { rules = ALL_RULES, fullTrace = false } = options;
  const trace: RuleTrace[] = [];
  let allow = true;
  let failedRule: RuleTrace | null = null;

  // Evaluate each rule
  for (const rule of rules) {
    const result = rule(policy, request, context);
    trace.push(result);

    if (!result.passed) {
      allow = false;
      if (!failedRule) {
        failedRule = result;
      }
      // Stop early unless fullTrace is requested
      if (!fullTrace) {
        break;
      }
    }
  }

  const projectedSpend = context.dailySpentUsd + request.priceUsd;
  const remainingDailyBudget = Math.max(0, policy.dailyCapUsd - projectedSpend);
  const remainingWeeklyBudget = policy.weeklyCapUsd
    ? Math.max(0, policy.weeklyCapUsd - (context.weeklySpentUsd + request.priceUsd))
    : undefined;

  return {
    allow,
    reason: failedRule?.reason ?? 'All policy rules passed',
    ruleId: failedRule?.ruleId ?? 'all_passed',
    projectedSpend,
    currentDailySpend: context.dailySpentUsd,
    currentWeeklySpend: context.weeklySpentUsd,
    remainingDailyBudget,
    remainingWeeklyBudget,
    policyId: policy.id,
    timestamp: new Date(),
    trace,
  };
}

/**
 * Create a policy evaluator with preset configuration
 */
export function createPolicyEvaluator(
  defaultPolicy: Policy = DEFAULT_POLICY,
  options: EvaluatorOptions = {}
) {
  return {
    /**
     * Evaluate a payment request
     */
    evaluate(
      request: PaymentRequest,
      context: SpendContext,
      policy: Policy = defaultPolicy
    ): PolicyDecision {
      return evaluatePolicy(policy, request, context, options);
    },

    /**
     * Quick check if a payment would be allowed (without full trace)
     */
    isAllowed(
      request: PaymentRequest,
      context: SpendContext,
      policy: Policy = defaultPolicy
    ): boolean {
      return evaluatePolicy(policy, request, context, { ...options, fullTrace: false }).allow;
    },

    /**
     * Get remaining budget for a caller
     */
    getRemainingBudget(
      context: SpendContext,
      policy: Policy = defaultPolicy
    ): { daily: number; weekly: number | undefined } {
      return {
        daily: Math.max(0, policy.dailyCapUsd - context.dailySpentUsd),
        weekly: policy.weeklyCapUsd
          ? Math.max(0, policy.weeklyCapUsd - context.weeklySpentUsd)
          : undefined,
      };
    },

    /**
     * Check what the maximum allowed price is for a request
     */
    getMaxAllowedPrice(
      request: Omit<PaymentRequest, 'priceUsd'>,
      context: SpendContext,
      policy: Policy = defaultPolicy
    ): number {
      const perCallCap = policy.endpointCaps?.[request.endpoint] ?? policy.perCallCapUsd;
      const dailyRemaining = policy.dailyCapUsd - context.dailySpentUsd;
      const weeklyRemaining = policy.weeklyCapUsd
        ? policy.weeklyCapUsd - context.weeklySpentUsd
        : Infinity;

      return Math.max(0, Math.min(perCallCap, dailyRemaining, weeklyRemaining));
    },
  };
}

/**
 * Create default spend context for a new caller
 */
export function createSpendContext(callerId: string): SpendContext {
  return {
    callerId,
    ...EMPTY_SPEND_CONTEXT,
    timestamp: new Date(),
  };
}

/**
 * Parse a payment request from URL and metadata
 */
export function parsePaymentRequest(
  url: string,
  priceUsd: number,
  callerId: string,
  metadata?: Record<string, unknown>
): PaymentRequest {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  const tool = pathParts[pathParts.length - 1] || 'unknown';

  return {
    endpoint: parsed.pathname,
    tool,
    domain: parsed.hostname,
    priceUsd,
    callerId,
    metadata,
  };
}
