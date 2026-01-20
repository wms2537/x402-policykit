"use client";

import { useState } from "react";

// Mock receipts data
const mockReceipts = [
  {
    id: "rcpt_abc123",
    callId: "call_001",
    endpoint: "/tool/extract",
    amountUsd: 0.05,
    buyer: "0x1234...5678",
    seller: "0x8765...4321",
    requestHash: "a1b2c3d4",
    responseHash: "e5f6g7h8",
    nonce: "nonce_123",
    verified: true,
    createdAt: "2025-01-19T10:30:00Z",
  },
  {
    id: "rcpt_def456",
    callId: "call_002",
    endpoint: "/tool/quote",
    amountUsd: 0.03,
    buyer: "0x1234...5678",
    seller: "0x8765...4321",
    requestHash: "b2c3d4e5",
    responseHash: "f6g7h8i9",
    nonce: "nonce_456",
    verified: true,
    createdAt: "2025-01-19T10:25:00Z",
  },
  {
    id: "rcpt_ghi789",
    callId: "call_003",
    endpoint: "/tool/verify",
    amountUsd: 0.02,
    buyer: "0x1234...5678",
    seller: "0x8765...4321",
    requestHash: "c3d4e5f6",
    responseHash: "g7h8i9j0",
    nonce: "nonce_789",
    verified: true,
    createdAt: "2025-01-19T10:20:00Z",
  },
];

export default function ReceiptsPage() {
  const [receipts] = useState(mockReceipts);
  const [selectedReceipt, setSelectedReceipt] = useState<typeof mockReceipts[0] | null>(null);

  const totalSpend = receipts.reduce((sum, r) => sum + r.amountUsd, 0);

  const exportReceipts = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      count: receipts.length,
      totalUsd: totalSpend,
      receipts: receipts,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `x402-receipts-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Payment Receipts</h1>
          <p className="text-gray-500">Cryptographic proof of all payments made</p>
        </div>
        <button onClick={exportReceipts} className="btn btn-secondary">
          Export JSON
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-500">Total Receipts</div>
          <div className="text-2xl font-bold">{receipts.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Total Spend</div>
          <div className="text-2xl font-bold">${totalSpend.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Verified</div>
          <div className="text-2xl font-bold text-[var(--success)]">
            {receipts.filter((r) => r.verified).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receipts List */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">All Receipts</h2>
          <div className="space-y-2">
            {receipts.map((receipt) => (
              <button
                key={receipt.id}
                onClick={() => setSelectedReceipt(receipt)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedReceipt?.id === receipt.id
                    ? "border-[var(--accent)] bg-[rgba(59,130,246,0.1)]"
                    : "border-[var(--border)] hover:bg-[var(--card-hover)]"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-mono text-sm">{receipt.endpoint}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(receipt.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">${receipt.amountUsd.toFixed(2)}</div>
                    {receipt.verified && (
                      <span className="badge badge-success text-xs">verified</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Receipt Detail */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Receipt Details</h2>
          {selectedReceipt ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Receipt ID</div>
                  <div className="font-mono text-sm">{selectedReceipt.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Amount</div>
                  <div className="font-mono">${selectedReceipt.amountUsd.toFixed(4)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Endpoint</div>
                <div className="font-mono">{selectedReceipt.endpoint}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Buyer</div>
                  <div className="font-mono text-sm">{selectedReceipt.buyer}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Seller</div>
                  <div className="font-mono text-sm">{selectedReceipt.seller}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <div className="text-sm text-gray-500 mb-2">Content Hashes</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">Request Hash</div>
                    <div className="font-mono text-sm bg-black p-2 rounded">
                      {selectedReceipt.requestHash}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Response Hash</div>
                    <div className="font-mono text-sm bg-black p-2 rounded">
                      {selectedReceipt.responseHash}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <div className="text-sm text-gray-500 mb-2">Payment Details</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Nonce</div>
                    <div className="font-mono">{selectedReceipt.nonce}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Timestamp</div>
                    <div className="font-mono">
                      {new Date(selectedReceipt.createdAt).toISOString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <a
                  href={`/receipts/${selectedReceipt.id}`}
                  className="btn btn-primary flex-1 text-center"
                >
                  Full Details
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedReceipt, null, 2));
                  }}
                  className="btn btn-secondary"
                >
                  Copy JSON
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Select a receipt to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
