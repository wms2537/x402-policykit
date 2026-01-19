"use client";

import { useState } from "react";
import type { Policy } from "@x402/policy-engine";

const defaultPolicy: Policy = {
  id: "default",
  name: "Default Policy",
  dailyCapUsd: 1.0,
  weeklyCapUsd: 5.0,
  perCallCapUsd: 0.10,
  allowTools: ["extract", "quote", "verify"],
  denyTools: [],
  allowDomains: [],
  denyDomains: ["example-bad.com"],
  endpointCaps: {},
  enabled: true,
};

export default function PolicyPage() {
  const [policy, setPolicy] = useState<Policy>(defaultPolicy);
  const [jsonView, setJsonView] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In real implementation, save to backend
    console.log("Saving policy:", policy);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPolicy(defaultPolicy);
  };

  const updateArrayField = (
    field: "allowTools" | "denyTools" | "allowDomains" | "denyDomains",
    value: string
  ) => {
    const items = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setPolicy((p) => ({ ...p, [field]: items }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Policy Editor</h1>
        <p className="text-gray-500">
          Configure spending limits and access controls for your agents
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setJsonView(false)}
          className={`btn ${!jsonView ? "btn-primary" : "btn-secondary"}`}
        >
          Form View
        </button>
        <button
          onClick={() => setJsonView(true)}
          className={`btn ${jsonView ? "btn-primary" : "btn-secondary"}`}
        >
          JSON View
        </button>
      </div>

      {jsonView ? (
        /* JSON Editor */
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Policy JSON</h2>
          <textarea
            className="w-full h-96 bg-black border border-[var(--border)] rounded p-4 font-mono text-sm"
            value={JSON.stringify(policy, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setPolicy(parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
          />
        </div>
      ) : (
        /* Form Editor */
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Policy ID</label>
                <input
                  type="text"
                  className="input"
                  value={policy.id}
                  onChange={(e) => setPolicy((p) => ({ ...p, id: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Policy Name</label>
                <input
                  type="text"
                  className="input"
                  value={policy.name}
                  onChange={(e) => setPolicy((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.enabled}
                  onChange={(e) => setPolicy((p) => ({ ...p, enabled: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span>Policy Enabled</span>
              </label>
            </div>
          </div>

          {/* Spending Limits */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Spending Limits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-sm text-gray-500 mb-1">Weekly Cap (USD)</label>
                <input
                  type="number"
                  step="0.5"
                  className="input"
                  value={policy.weeklyCapUsd || ""}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      weeklyCapUsd: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
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
            </div>
          </div>

          {/* Tool Access */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Tool Access Control</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Allowed Tools (comma-separated, empty = allow all)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="extract, quote, verify"
                  value={policy.allowTools.join(", ")}
                  onChange={(e) => updateArrayField("allowTools", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Denied Tools (comma-separated)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="dangerous-tool"
                  value={policy.denyTools?.join(", ") || ""}
                  onChange={(e) => updateArrayField("denyTools", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Domain Access */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Domain Access Control</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Allowed Domains (comma-separated, empty = allow all)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="api.example.com, trusted.io"
                  value={policy.allowDomains?.join(", ") || ""}
                  onChange={(e) => updateArrayField("allowDomains", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Denied Domains (comma-separated)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="example-bad.com"
                  value={policy.denyDomains?.join(", ") || ""}
                  onChange={(e) => updateArrayField("denyDomains", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mt-6">
        <button onClick={handleSave} className="btn btn-primary">
          {saved ? "Saved!" : "Save Policy"}
        </button>
        <button onClick={handleReset} className="btn btn-secondary">
          Reset to Default
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(policy, null, 2));
          }}
          className="btn btn-secondary"
        >
          Copy JSON
        </button>
      </div>

      {/* Policy Preview */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Policy Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status</span>
            <div>
              <span className={`badge ${policy.enabled ? "badge-success" : "badge-danger"}`}>
                {policy.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
          <div>
            <span className="text-gray-500">Daily Limit</span>
            <div className="font-mono">${policy.dailyCapUsd.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-500">Per-Call Limit</span>
            <div className="font-mono">${policy.perCallCapUsd.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-500">Allowed Tools</span>
            <div>{policy.allowTools.length || "All"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
