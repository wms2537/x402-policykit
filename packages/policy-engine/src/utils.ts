/**
 * x402 Policy Engine Utilities
 */

import type { Policy, PolicyDecision, SpendContext } from './types';
import { DEFAULT_POLICY } from './types';

/**
 * Merge a partial policy with defaults
 */
export function mergeWithDefaults(partial: Partial<Policy>): Policy {
  return {
    ...DEFAULT_POLICY,
    ...partial,
    id: partial.id ?? `policy_${Date.now()}`,
    name: partial.name ?? 'Custom Policy',
  };
}

/**
 * Validate a policy configuration
 */
export function validatePolicy(policy: Policy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!policy.id) {
    errors.push('Policy must have an id');
  }

  if (policy.dailyCapUsd < 0) {
    errors.push('Daily cap must be non-negative');
  }

  if (policy.weeklyCapUsd !== undefined && policy.weeklyCapUsd < 0) {
    errors.push('Weekly cap must be non-negative');
  }

  if (policy.perCallCapUsd < 0) {
    errors.push('Per-call cap must be non-negative');
  }

  if (policy.perCallCapUsd > policy.dailyCapUsd) {
    errors.push('Per-call cap cannot exceed daily cap');
  }

  if (policy.weeklyCapUsd !== undefined && policy.dailyCapUsd * 7 > policy.weeklyCapUsd) {
    // This is a warning, not an error
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format a policy decision for logging
 */
export function formatDecision(decision: PolicyDecision): string {
  const status = decision.allow ? 'ALLOWED' : 'BLOCKED';
  const emoji = decision.allow ? '+' : 'X';

  return [
    `[${emoji}] ${status}: ${decision.reason}`,
    `    Rule: ${decision.ruleId}`,
    `    Projected spend: $${decision.projectedSpend.toFixed(4)}`,
    `    Remaining daily: $${decision.remainingDailyBudget.toFixed(4)}`,
    decision.remainingWeeklyBudget !== undefined
      ? `    Remaining weekly: $${decision.remainingWeeklyBudget.toFixed(4)}`
      : null,
  ].filter(Boolean).join('\n');
}

/**
 * Format a policy decision as a compact JSON log entry
 */
export function decisionToLogEntry(decision: PolicyDecision): object {
  return {
    allow: decision.allow,
    reason: decision.reason,
    ruleId: decision.ruleId,
    projectedSpendUsd: decision.projectedSpend,
    remainingDailyUsd: decision.remainingDailyBudget,
    remainingWeeklyUsd: decision.remainingWeeklyBudget,
    policyId: decision.policyId,
    timestamp: decision.timestamp.toISOString(),
  };
}

/**
 * Serialize policy for storage/transmission
 */
export function serializePolicy(policy: Policy): string {
  return JSON.stringify(policy, null, 2);
}

/**
 * Deserialize policy from storage/transmission
 */
export function deserializePolicy(json: string): Policy {
  const parsed = JSON.parse(json);
  return mergeWithDefaults(parsed);
}

/**
 * Calculate spend statistics from context
 */
export function calculateSpendStats(context: SpendContext, policy: Policy): {
  dailyUsagePercent: number;
  weeklyUsagePercent: number | undefined;
  averagePerCall: number;
  callsRemaining: number;
} {
  const dailyUsagePercent = (context.dailySpentUsd / policy.dailyCapUsd) * 100;
  const weeklyUsagePercent = policy.weeklyCapUsd
    ? (context.weeklySpentUsd / policy.weeklyCapUsd) * 100
    : undefined;
  const averagePerCall = context.dailyCallCount > 0
    ? context.dailySpentUsd / context.dailyCallCount
    : 0;
  const remainingBudget = policy.dailyCapUsd - context.dailySpentUsd;
  const callsRemaining = averagePerCall > 0
    ? Math.floor(remainingBudget / averagePerCall)
    : Math.floor(remainingBudget / policy.perCallCapUsd);

  return {
    dailyUsagePercent,
    weeklyUsagePercent,
    averagePerCall,
    callsRemaining,
  };
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * Get current date string in YYYY-MM-DD format
 */
export function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current week's Monday date string
 */
export function getWeekStartString(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Hash a string using simple djb2 algorithm (for non-crypto purposes)
 */
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Create a deterministic hash of request/response for receipts
 */
export function createContentHash(content: string | object): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  return hashString(str);
}
