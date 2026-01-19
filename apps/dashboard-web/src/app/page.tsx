"use client";

import { useState, useEffect } from "react";

// Mock data for demo
const mockSpendData = {
  today: { total: 0.23, calls: 12, blocked: 2 },
  week: { total: 1.45, calls: 67, blocked: 8 },
  policy: {
    dailyCapUsd: 1.0,
    perCallCapUsd: 0.10,
  },
};

const mockRecentCalls = [
  { id: 1, endpoint: "/tool/extract", price: 0.05, status: "paid", time: "2 min ago" },
  { id: 2, endpoint: "/tool/quote", price: 0.03, status: "paid", time: "5 min ago" },
  { id: 3, endpoint: "/tool/verify", price: 0.25, status: "blocked", time: "8 min ago", reason: "Exceeds per-call cap" },
  { id: 4, endpoint: "/tool/extract", price: 0.05, status: "paid", time: "12 min ago" },
  { id: 5, endpoint: "/tool/quote", price: 0.03, status: "paid", time: "15 min ago" },
];

const mockTopEndpoints = [
  { endpoint: "/tool/extract", calls: 45, spend: 2.25 },
  { endpoint: "/tool/quote", calls: 28, spend: 0.84 },
  { endpoint: "/tool/verify", calls: 15, spend: 0.30 },
];

export default function Dashboard() {
  const [spendData] = useState(mockSpendData);
  const [recentCalls] = useState(mockRecentCalls);
  const [topEndpoints] = useState(mockTopEndpoints);

  const dailyUsagePercent = (spendData.today.total / spendData.policy.dailyCapUsd) * 100;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Spend Dashboard</h1>
        <p className="text-gray-500">Monitor your agent&apos;s API spending and policy enforcement</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Today&apos;s Spend</div>
          <div className="text-2xl font-bold">${spendData.today.total.toFixed(2)}</div>
          <div className="mt-2">
            <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.min(dailyUsagePercent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {dailyUsagePercent.toFixed(0)}% of ${spendData.policy.dailyCapUsd.toFixed(2)} daily cap
            </div>
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Weekly Spend</div>
          <div className="text-2xl font-bold">${spendData.week.total.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">{spendData.week.calls} calls</div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Successful Calls</div>
          <div className="text-2xl font-bold text-[var(--success)]">{spendData.today.calls}</div>
          <div className="text-sm text-gray-500 mt-1">Today</div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Blocked Calls</div>
          <div className="text-2xl font-bold text-[var(--danger)]">{spendData.today.blocked}</div>
          <div className="text-sm text-gray-500 mt-1">By policy</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${
                      call.status === "paid" ? "badge-success" : "badge-danger"
                    }`}
                  >
                    {call.status}
                  </span>
                  <div>
                    <div className="font-mono text-sm">{call.endpoint}</div>
                    {call.reason && (
                      <div className="text-xs text-[var(--danger)]">{call.reason}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono">${call.price.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{call.time}</div>
                </div>
              </div>
            ))}
          </div>
          <a href="/receipts" className="block mt-4 text-sm text-[var(--accent)] hover:underline">
            View all receipts
          </a>
        </div>

        {/* Top Endpoints */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Top Endpoints by Spend</h2>
          <div className="space-y-4">
            {topEndpoints.map((ep, i) => (
              <div key={ep.endpoint}>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-sm">{ep.endpoint}</span>
                  <span className="font-mono">${ep.spend.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all"
                    style={{
                      width: `${(ep.spend / topEndpoints[0].spend) * 100}%`,
                      opacity: 1 - i * 0.2,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{ep.calls} calls</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Policy Summary */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Active Policy</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Daily Cap</div>
            <div className="font-mono text-lg">${spendData.policy.dailyCapUsd.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Per-Call Cap</div>
            <div className="font-mono text-lg">${spendData.policy.perCallCapUsd.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Remaining Today</div>
            <div className="font-mono text-lg text-[var(--success)]">
              ${(spendData.policy.dailyCapUsd - spendData.today.total).toFixed(2)}
            </div>
          </div>
          <div>
            <a href="/policy" className="btn btn-secondary inline-block">
              Edit Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
