/**
 * x402 Policy Rules
 * Individual rule implementations for policy evaluation
 */

import type { Policy, SpendContext, PaymentRequest, RuleTrace } from './types';

export type RuleFunction = (
  policy: Policy,
  request: PaymentRequest,
  context: SpendContext
) => RuleTrace;

/**
 * Check if policy is enabled
 */
export const policyEnabledRule: RuleFunction = (policy) => {
  return {
    ruleId: 'policy_enabled',
    ruleName: 'Policy Enabled Check',
    passed: policy.enabled,
    reason: policy.enabled
      ? 'Policy is enabled'
      : 'Policy is disabled - all payments blocked',
    values: { enabled: policy.enabled },
  };
};

/**
 * Check per-call cap
 */
export const perCallCapRule: RuleFunction = (policy, request) => {
  const cap = policy.endpointCaps?.[request.endpoint] ?? policy.perCallCapUsd;
  const passed = request.priceUsd <= cap;

  return {
    ruleId: 'per_call_cap',
    ruleName: 'Per-Call Cap',
    passed,
    reason: passed
      ? `Price $${request.priceUsd.toFixed(4)} within per-call cap of $${cap.toFixed(2)}`
      : `Price $${request.priceUsd.toFixed(4)} exceeds per-call cap of $${cap.toFixed(2)}`,
    values: {
      price: request.priceUsd,
      cap,
      endpoint: request.endpoint,
      hasCustomCap: !!policy.endpointCaps?.[request.endpoint],
    },
  };
};

/**
 * Check daily spending cap
 */
export const dailyCapRule: RuleFunction = (policy, request, context) => {
  const projectedSpend = context.dailySpentUsd + request.priceUsd;
  const passed = projectedSpend <= policy.dailyCapUsd;

  return {
    ruleId: 'daily_cap',
    ruleName: 'Daily Cap',
    passed,
    reason: passed
      ? `Projected daily spend $${projectedSpend.toFixed(4)} within cap of $${policy.dailyCapUsd.toFixed(2)}`
      : `Projected daily spend $${projectedSpend.toFixed(4)} exceeds cap of $${policy.dailyCapUsd.toFixed(2)}`,
    values: {
      currentSpend: context.dailySpentUsd,
      requestPrice: request.priceUsd,
      projectedSpend,
      cap: policy.dailyCapUsd,
      remaining: policy.dailyCapUsd - context.dailySpentUsd,
    },
  };
};

/**
 * Check weekly spending cap
 */
export const weeklyCapRule: RuleFunction = (policy, request, context) => {
  if (!policy.weeklyCapUsd) {
    return {
      ruleId: 'weekly_cap',
      ruleName: 'Weekly Cap',
      passed: true,
      reason: 'No weekly cap configured',
      values: { configured: false },
    };
  }

  const projectedSpend = context.weeklySpentUsd + request.priceUsd;
  const passed = projectedSpend <= policy.weeklyCapUsd;

  return {
    ruleId: 'weekly_cap',
    ruleName: 'Weekly Cap',
    passed,
    reason: passed
      ? `Projected weekly spend $${projectedSpend.toFixed(4)} within cap of $${policy.weeklyCapUsd.toFixed(2)}`
      : `Projected weekly spend $${projectedSpend.toFixed(4)} exceeds cap of $${policy.weeklyCapUsd.toFixed(2)}`,
    values: {
      currentSpend: context.weeklySpentUsd,
      requestPrice: request.priceUsd,
      projectedSpend,
      cap: policy.weeklyCapUsd,
      remaining: policy.weeklyCapUsd - context.weeklySpentUsd,
    },
  };
};

/**
 * Check tool allowlist
 */
export const toolAllowlistRule: RuleFunction = (policy, request) => {
  // If no allowlist, all tools are allowed
  if (!policy.allowTools || policy.allowTools.length === 0) {
    return {
      ruleId: 'tool_allowlist',
      ruleName: 'Tool Allowlist',
      passed: true,
      reason: 'No tool allowlist configured - all tools allowed',
      values: { configured: false },
    };
  }

  const passed = policy.allowTools.includes(request.tool);

  return {
    ruleId: 'tool_allowlist',
    ruleName: 'Tool Allowlist',
    passed,
    reason: passed
      ? `Tool "${request.tool}" is in allowlist`
      : `Tool "${request.tool}" is not in allowlist [${policy.allowTools.join(', ')}]`,
    values: {
      tool: request.tool,
      allowlist: policy.allowTools,
    },
  };
};

/**
 * Check tool denylist
 */
export const toolDenylistRule: RuleFunction = (policy, request) => {
  if (!policy.denyTools || policy.denyTools.length === 0) {
    return {
      ruleId: 'tool_denylist',
      ruleName: 'Tool Denylist',
      passed: true,
      reason: 'No tool denylist configured',
      values: { configured: false },
    };
  }

  const passed = !policy.denyTools.includes(request.tool);

  return {
    ruleId: 'tool_denylist',
    ruleName: 'Tool Denylist',
    passed,
    reason: passed
      ? `Tool "${request.tool}" is not in denylist`
      : `Tool "${request.tool}" is blocked by denylist`,
    values: {
      tool: request.tool,
      denylist: policy.denyTools,
    },
  };
};

/**
 * Check domain allowlist
 */
export const domainAllowlistRule: RuleFunction = (policy, request) => {
  if (!policy.allowDomains || policy.allowDomains.length === 0) {
    return {
      ruleId: 'domain_allowlist',
      ruleName: 'Domain Allowlist',
      passed: true,
      reason: 'No domain allowlist configured - all domains allowed',
      values: { configured: false },
    };
  }

  const passed = policy.allowDomains.some(d =>
    request.domain === d || request.domain.endsWith(`.${d}`)
  );

  return {
    ruleId: 'domain_allowlist',
    ruleName: 'Domain Allowlist',
    passed,
    reason: passed
      ? `Domain "${request.domain}" is in allowlist`
      : `Domain "${request.domain}" is not in allowlist [${policy.allowDomains.join(', ')}]`,
    values: {
      domain: request.domain,
      allowlist: policy.allowDomains,
    },
  };
};

/**
 * Check domain denylist
 */
export const domainDenylistRule: RuleFunction = (policy, request) => {
  if (!policy.denyDomains || policy.denyDomains.length === 0) {
    return {
      ruleId: 'domain_denylist',
      ruleName: 'Domain Denylist',
      passed: true,
      reason: 'No domain denylist configured',
      values: { configured: false },
    };
  }

  const isDenied = policy.denyDomains.some(d =>
    request.domain === d || request.domain.endsWith(`.${d}`)
  );
  const passed = !isDenied;

  return {
    ruleId: 'domain_denylist',
    ruleName: 'Domain Denylist',
    passed,
    reason: passed
      ? `Domain "${request.domain}" is not in denylist`
      : `Domain "${request.domain}" is blocked by denylist`,
    values: {
      domain: request.domain,
      denylist: policy.denyDomains,
    },
  };
};

/**
 * All rules in evaluation order (fail-fast)
 */
export const ALL_RULES: RuleFunction[] = [
  policyEnabledRule,
  toolDenylistRule,
  domainDenylistRule,
  toolAllowlistRule,
  domainAllowlistRule,
  perCallCapRule,
  dailyCapRule,
  weeklyCapRule,
];
