"use client";

import { useState } from "react";
import type { Policy, PolicyDecision } from "@x402/policy-engine";

// Default policy for demo
const defaultPolicy: Policy = {
  id: "demo",
  name: "Demo Policy",
  dailyCapUsd: 1.0,
  weeklyCapUsd: 5.0,
  perCallCapUsd: 0.10,
  allowTools: ["extract", "quote", "verify"],
  denyTools: [],
  allowDomains: [],
  denyDomains: [],
  enabled: true,
};

interface CallLog {
  id: string;
  endpoint: string;
  priceUsd: number;
  status: "pending" | "paid" | "blocked";
  decision?: PolicyDecision;
  response?: unknown;
  timestamp: Date;
}

interface SpendState {
  dailySpentUsd: number;
  weeklySpentUsd: number;
  dailyCallCount: number;
}

export default function DemoPage() {
  const [policy, setPolicy] = useState<Policy>(defaultPolicy);
  const [spend, setSpend] = useState<SpendState>({
    dailySpentUsd: 0,
    weeklySpentUsd: 0,
    dailyCallCount: 0,
  });
  const [callLog, setCallLog] = useState<CallLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [apiBase, setApiBase] = useState("http://localhost:8787");

  // Simulate policy evaluation (client-side for demo)
  const evaluatePolicy = (
    endpoint: string,
    priceUsd: number
  ): { allow: boolean; reason: string; ruleId: string } => {
    const tool = endpoint.split("/").pop() || "unknown";

    // Check per-call cap
    if (priceUsd > policy.perCallCapUsd) {
      return {
        allow: false,
        reason: `Price $${priceUsd.toFixed(2)} exceeds per-call cap of $${policy.perCallCapUsd.toFixed(2)}`,
        ruleId: "per_call_cap",
      };
    }

    // Check daily cap
    const projectedSpend = spend.dailySpentUsd + priceUsd;
    if (projectedSpend > policy.dailyCapUsd) {
      return {
        allow: false,
        reason: `Projected spend $${projectedSpend.toFixed(2)} exceeds daily cap of $${policy.dailyCapUsd.toFixed(2)}`,
        ruleId: "daily_cap",
      };
    }

    // Check tool allowlist
    if (policy.allowTools.length > 0 && !policy.allowTools.includes(tool)) {
      return {
        allow: false,
        reason: `Tool "${tool}" is not in allowlist`,
        ruleId: "tool_allowlist",
      };
    }

    return {
      allow: true,
      reason: "All policy rules passed",
      ruleId: "all_passed",
    };
  };

  // Simulate a tool call
  const makeToolCall = async (endpoint: string, priceUsd: number, body: object) => {
    const callId = `call_${Date.now()}`;

    // Add pending call to log
    const pendingCall: CallLog = {
      id: callId,
      endpoint,
      priceUsd,
      status: "pending",
      timestamp: new Date(),
    };
    setCallLog((prev) => [pendingCall, ...prev]);

    // Evaluate policy
    const decision = evaluatePolicy(endpoint, priceUsd);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 500));

    if (!decision.allow) {
      // Blocked by policy
      setCallLog((prev) =>
        prev.map((c) =>
          c.id === callId
            ? {
                ...c,
                status: "blocked" as const,
                decision: {
                  allow: false,
                  reason: decision.reason,
                  ruleId: decision.ruleId,
                  projectedSpend: spend.dailySpentUsd + priceUsd,
                  currentDailySpend: spend.dailySpentUsd,
                  currentWeeklySpend: spend.weeklySpentUsd,
                  remainingDailyBudget: Math.max(0, policy.dailyCapUsd - spend.dailySpentUsd),
                  policyId: policy.id,
                  timestamp: new Date(),
                  trace: [],
                },
              }
            : c
        )
      );
      return;
    }

    // Simulate successful payment
    try {
      // In real implementation, this would call the actual API
      const mockResponse = {
        success: true,
        result: { mock: true, endpoint },
        meta: { paid: true, priceUsd },
      };

      // Update spend
      setSpend((prev) => ({
        dailySpentUsd: prev.dailySpentUsd + priceUsd,
        weeklySpentUsd: prev.weeklySpentUsd + priceUsd,
        dailyCallCount: prev.dailyCallCount + 1,
      }));

      // Update call log
      setCallLog((prev) =>
        prev.map((c) =>
          c.id === callId
            ? {
                ...c,
                status: "paid" as const,
                response: mockResponse,
                decision: {
                  allow: true,
                  reason: decision.reason,
                  ruleId: decision.ruleId,
                  projectedSpend: spend.dailySpentUsd + priceUsd,
                  currentDailySpend: spend.dailySpentUsd,
                  currentWeeklySpend: spend.weeklySpentUsd,
                  remainingDailyBudget: policy.dailyCapUsd - spend.dailySpentUsd - priceUsd,
                  policyId: policy.id,
                  timestamp: new Date(),
                  trace: [],
                },
              }
            : c
        )
      );
    } catch (error) {
      console.error("Call failed:", error);
    }
  };

  // Run demo workflow
  const runDemoWorkflow = async () => {
    setIsRunning(true);

    // Call 1: Quote (should succeed)
    await makeToolCall("/tool/quote", 0.03, { task: "Analyze data", complexity: "medium" });
    await new Promise((r) => setTimeout(r, 1000));

    // Call 2: Extract (should succeed)
    await makeToolCall("/tool/extract", 0.05, { content: "Sample content for extraction" });
    await new Promise((r) => setTimeout(r, 1000));

    // Call 3: Verify (should succeed)
    await makeToolCall("/tool/verify", 0.02, { data: "test data", hash: "" });
    await new Promise((r) => setTimeout(r, 1000));

    // Call 4: High-price call (should be blocked by per-call cap)
    await makeToolCall("/tool/extract", 0.25, { content: "Expensive extraction" });

    setIsRunning(false);
  };

  // Reset demo state
  const resetDemo = () => {
    setSpend({ dailySpentUsd: 0, weeklySpentUsd: 0, dailyCallCount: 0 });
    setCallLog([]);
  };

  const remainingBudget = policy.dailyCapUsd - spend.dailySpentUsd;
  const usagePercent = (spend.dailySpentUsd / policy.dailyCapUsd) * 100;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Live Demo</h1>
        <p className="text-gray-500">
          Watch policy enforcement in action as an agent workflow runs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy Configuration */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Policy Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Daily Cap (USD)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={policy.dailyCapUsd}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, dailyCapUsd: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Per-Call Cap (USD)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={policy.perCallCapUsd}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, perCallCapUsd: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">API Base URL</label>
              <input
                type="text"
                className="input"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <div className="text-sm text-gray-500 mb-2">Current Spend</div>
            <div className="text-2xl font-bold">${spend.dailySpentUsd.toFixed(2)}</div>
            <div className="mt-2">
              <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    usagePercent > 80 ? "bg-[var(--danger)]" : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ${remainingBudget.toFixed(2)} remaining
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={runDemoWorkflow}
              disabled={isRunning}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {isRunning ? "Running..." : "Run Demo Workflow"}
            </button>
            <button onClick={resetDemo} className="btn btn-secondary w-full">
              Reset
            </button>
          </div>
        </div>

        {/* Call Log */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Call Log</h2>
          {callLog.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No calls yet. Click &ldquo;Run Demo Workflow&rdquo; to start.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {callLog.map((call) => (
                <div
                  key={call.id}
                  className={`p-4 rounded-lg border ${
                    call.status === "blocked"
                      ? "border-[var(--danger)] bg-[rgba(239,68,68,0.1)]"
                      : call.status === "paid"
                      ? "border-[var(--success)] bg-[rgba(34,197,94,0.05)]"
                      : "border-[var(--border)] bg-[var(--card)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge ${
                          call.status === "blocked"
                            ? "badge-danger"
                            : call.status === "paid"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {call.status}
                      </span>
                      <span className="font-mono">{call.endpoint}</span>
                    </div>
                    <span className="font-mono">${call.priceUsd.toFixed(2)}</span>
                  </div>

                  {call.decision && (
                    <div className="mt-2 text-sm">
                      <div
                        className={
                          call.status === "blocked" ? "text-[var(--danger)]" : "text-gray-500"
                        }
                      >
                        {call.decision.reason}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Rule: {call.decision.ruleId}
                      </div>
                    </div>
                  )}

                  {call.status === "blocked" && call.decision && (
                    <div className="mt-3 p-3 bg-black rounded text-xs font-mono">
                      <div className="text-[var(--danger)]">BLOCKED BY POLICY</div>
                      <div className="text-gray-500 mt-1">
                        Projected spend: ${call.decision.projectedSpend.toFixed(4)}
                      </div>
                      <div className="text-gray-500">
                        Remaining budget: ${call.decision.remainingDailyBudget.toFixed(4)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Demo Script */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Demo Script</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">What this demo shows:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
              <li>Set policy: daily $1, per call $0.10</li>
              <li>Run &ldquo;research workflow&rdquo; (3 tool calls)</li>
              <li>Quote: $0.03 - should pass</li>
              <li>Extract: $0.05 - should pass</li>
              <li>Verify: $0.02 - should pass</li>
              <li>Extract (expensive): $0.25 - should be blocked</li>
            </ol>
          </div>
          <div>
            <h3 className="font-medium mb-2">Key features demonstrated:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
              <li>Real-time policy evaluation</li>
              <li>Per-call spending caps</li>
              <li>Human-readable block reasons</li>
              <li>Spend tracking and visualization</li>
              <li>Decision trace for debugging</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
