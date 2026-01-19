/**
 * x402 Spend Storage implementations
 */

import type { SpendContext, PolicyDecision } from '@x402/policy-engine';
import { createSpendContext, generateId, getCurrentDateString } from '@x402/policy-engine';
import type { SpendStorage } from './types';

/**
 * In-memory spend storage (for development/testing)
 */
export class InMemorySpendStorage implements SpendStorage {
  private contexts: Map<string, SpendContext> = new Map();
  private payments: Array<{
    id: string;
    callerId: string;
    amountUsd: number;
    endpoint: string;
    nonce: string;
    paymentRef: string;
    timestamp: Date;
  }> = [];
  private decisions: Array<{
    id: string;
    callerId: string;
    decision: PolicyDecision;
    endpoint: string;
    priceUsd: number;
    timestamp: Date;
  }> = [];

  async getSpendContext(callerId: string): Promise<SpendContext> {
    const existing = this.contexts.get(callerId);
    if (existing) {
      return existing;
    }
    const newContext = createSpendContext(callerId);
    this.contexts.set(callerId, newContext);
    return newContext;
  }

  async recordPayment(
    callerId: string,
    amountUsd: number,
    metadata: { endpoint: string; nonce: string; paymentRef: string }
  ): Promise<void> {
    // Update context
    const context = await this.getSpendContext(callerId);
    context.dailySpentUsd += amountUsd;
    context.weeklySpentUsd += amountUsd;
    context.dailyCallCount += 1;
    context.timestamp = new Date();
    this.contexts.set(callerId, context);

    // Record payment
    this.payments.push({
      id: generateId('pay'),
      callerId,
      amountUsd,
      ...metadata,
      timestamp: new Date(),
    });
  }

  async recordDecision(
    callerId: string,
    decision: PolicyDecision,
    metadata: { endpoint: string; priceUsd: number }
  ): Promise<void> {
    this.decisions.push({
      id: generateId('dec'),
      callerId,
      decision,
      ...metadata,
      timestamp: new Date(),
    });
  }

  // Helper methods for testing/debugging
  getPayments() {
    return [...this.payments];
  }

  getDecisions() {
    return [...this.decisions];
  }

  getBlockedDecisions() {
    return this.decisions.filter(d => !d.decision.allow);
  }

  clear() {
    this.contexts.clear();
    this.payments = [];
    this.decisions = [];
  }
}

/**
 * D1 spend storage for Cloudflare Workers
 */
export class D1SpendStorage implements SpendStorage {
  constructor(private db: D1Database) {}

  async getSpendContext(callerId: string): Promise<SpendContext> {
    const today = getCurrentDateString();
    const weekStart = getWeekStart();

    // Get daily spend
    const dailyResult = await this.db
      .prepare(
        `SELECT COALESCE(SUM(amount_usd), 0) as total, COUNT(*) as count
         FROM calls WHERE caller_id = ? AND date(created_at) = ? AND paid = 1`
      )
      .bind(callerId, today)
      .first<{ total: number; count: number }>();

    // Get weekly spend
    const weeklyResult = await this.db
      .prepare(
        `SELECT COALESCE(SUM(amount_usd), 0) as total
         FROM calls WHERE caller_id = ? AND date(created_at) >= ? AND paid = 1`
      )
      .bind(callerId, weekStart)
      .first<{ total: number }>();

    return {
      callerId,
      dailySpentUsd: dailyResult?.total ?? 0,
      weeklySpentUsd: weeklyResult?.total ?? 0,
      dailyCallCount: dailyResult?.count ?? 0,
      timestamp: new Date(),
    };
  }

  async recordPayment(
    callerId: string,
    amountUsd: number,
    metadata: { endpoint: string; nonce: string; paymentRef: string }
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO calls (id, endpoint, method, caller_id, price_usd, paid, payment_ref, created_at)
         VALUES (?, ?, 'POST', ?, ?, 1, ?, datetime('now'))`
      )
      .bind(
        generateId('call'),
        metadata.endpoint,
        callerId,
        amountUsd,
        metadata.paymentRef
      )
      .run();

    // Update daily spend aggregate
    const today = getCurrentDateString();
    await this.db
      .prepare(
        `INSERT INTO daily_spend (id, caller_id, date, total_usd, call_count, updated_at)
         VALUES (?, ?, ?, ?, 1, datetime('now'))
         ON CONFLICT(caller_id, date) DO UPDATE SET
           total_usd = total_usd + ?,
           call_count = call_count + 1,
           updated_at = datetime('now')`
      )
      .bind(generateId('ds'), callerId, today, amountUsd, amountUsd)
      .run();
  }

  async recordDecision(
    callerId: string,
    decision: PolicyDecision,
    metadata: { endpoint: string; priceUsd: number }
  ): Promise<void> {
    const callId = generateId('call');

    // Insert call record
    await this.db
      .prepare(
        `INSERT INTO calls (id, endpoint, method, caller_id, price_usd, paid, created_at)
         VALUES (?, ?, 'POST', ?, ?, 0, datetime('now'))`
      )
      .bind(callId, metadata.endpoint, callerId, metadata.priceUsd)
      .run();

    // Insert decision record
    await this.db
      .prepare(
        `INSERT INTO policy_decisions (id, call_id, policy_id, allowed, reason, rule_id,
         projected_spend_usd, daily_spent_usd, weekly_spent_usd, policy_snapshot, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        generateId('dec'),
        callId,
        decision.policyId,
        decision.allow ? 1 : 0,
        decision.reason,
        decision.ruleId,
        decision.projectedSpend,
        decision.currentDailySpend,
        decision.currentWeeklySpend,
        JSON.stringify(decision.trace)
      )
      .run();

    // Update blocked count if blocked
    if (!decision.allow) {
      const today = getCurrentDateString();
      await this.db
        .prepare(
          `INSERT INTO daily_spend (id, caller_id, date, total_usd, call_count, blocked_count, updated_at)
           VALUES (?, ?, ?, 0, 0, 1, datetime('now'))
           ON CONFLICT(caller_id, date) DO UPDATE SET
             blocked_count = blocked_count + 1,
             updated_at = datetime('now')`
        )
        .bind(generateId('ds'), callerId, today)
        .run();
    }
  }
}

// D1Database type stub for non-CF environments
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
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}
