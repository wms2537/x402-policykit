"use client";

import { useParams } from "next/navigation";

// Mock receipt data
const mockReceipt = {
  id: "rcpt_abc123",
  callId: "call_001",
  endpoint: "/tool/extract",
  method: "POST",
  amountUsd: 0.05,
  amountToken: "50000",
  token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  chainId: 84532,
  buyer: "0x1234567890abcdef1234567890abcdef12345678",
  seller: "0x8765432109fedcba8765432109fedcba87654321",
  signature: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
  requestHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  responseHash: "e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  nonce: "nonce_1705662600_abc123",
  expiry: "2025-01-19T11:00:00Z",
  verified: true,
  createdAt: "2025-01-19T10:30:00Z",
  request: {
    content: "Sample content for extraction analysis",
  },
  response: {
    success: true,
    result: {
      entities: ["Sample", "Content"],
      keywords: ["extraction", "analysis"],
      summary: "Sample content for extraction...",
    },
  },
};

export default function ReceiptDetailPage() {
  const params = useParams();
  const receiptId = params.id;

  // In real implementation, fetch receipt by ID
  const receipt = mockReceipt;

  const chainNames: Record<number, string> = {
    1: "Ethereum Mainnet",
    84532: "Base Sepolia",
    8453: "Base",
  };

  const explorerUrls: Record<number, string> = {
    1: "https://etherscan.io",
    84532: "https://sepolia.basescan.org",
    8453: "https://basescan.org",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <a href="/receipts" className="text-[var(--accent)] hover:underline mb-2 block">
          ← Back to Receipts
        </a>
        <h1 className="text-3xl font-bold mb-2">Receipt Details</h1>
        <p className="text-gray-500 font-mono">{receiptId}</p>
      </div>

      {/* Status Banner */}
      <div
        className={`p-4 rounded-lg mb-6 ${
          receipt.verified
            ? "bg-[rgba(34,197,94,0.1)] border border-[var(--success)]"
            : "bg-[rgba(234,179,8,0.1)] border border-[var(--warning)]"
        }`}
      >
        <div className="flex items-center gap-2">
          {receipt.verified ? (
            <>
              <span className="text-[var(--success)] text-xl">✓</span>
              <span className="font-medium">Payment Verified</span>
            </>
          ) : (
            <>
              <span className="text-[var(--warning)] text-xl">!</span>
              <span className="font-medium">Pending Verification</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Info */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Payment Information</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount (USD)</span>
              <span className="font-mono font-bold text-xl">
                ${receipt.amountUsd.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount (Token)</span>
              <span className="font-mono">{receipt.amountToken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Chain</span>
              <span>{chainNames[receipt.chainId] || `Chain ${receipt.chainId}`}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Token Address</span>
              <span className="font-mono text-sm break-all">{receipt.token}</span>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Transaction Parties</h2>
          <div className="space-y-4">
            <div>
              <span className="text-gray-500 block mb-1">Buyer (Payer)</span>
              <span className="font-mono text-sm break-all">{receipt.buyer}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Seller (Payee)</span>
              <span className="font-mono text-sm break-all">{receipt.seller}</span>
            </div>
          </div>
        </div>

        {/* Request/Response Hashes */}
        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Content Hashes (Deterministic)</h2>
          <p className="text-sm text-gray-500 mb-4">
            These hashes provide cryptographic proof of the exact request and response content.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500 block mb-1">Request Hash</span>
              <div className="font-mono text-sm bg-black p-3 rounded break-all">
                {receipt.requestHash}
              </div>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Response Hash</span>
              <div className="font-mono text-sm bg-black p-3 rounded break-all">
                {receipt.responseHash}
              </div>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Payment Signature</h2>
          <div className="bg-black p-4 rounded font-mono text-sm break-all">
            {receipt.signature}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Nonce</span>
              <div className="font-mono">{receipt.nonce}</div>
            </div>
            <div>
              <span className="text-gray-500">Expiry</span>
              <div className="font-mono">{new Date(receipt.expiry).toISOString()}</div>
            </div>
          </div>
        </div>

        {/* API Call Details */}
        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">API Call Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-gray-500">Endpoint</span>
              <div className="font-mono">{receipt.endpoint}</div>
            </div>
            <div>
              <span className="text-gray-500">Method</span>
              <div className="font-mono">{receipt.method}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500 block mb-2">Request Body</span>
              <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(receipt.request, null, 2)}
              </pre>
            </div>
            <div>
              <span className="text-gray-500 block mb-2">Response Body</span>
              <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(receipt.response, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Timestamps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-gray-500">Created</span>
              <div className="font-mono">{new Date(receipt.createdAt).toISOString()}</div>
            </div>
            <div>
              <span className="text-gray-500">Expiry</span>
              <div className="font-mono">{new Date(receipt.expiry).toISOString()}</div>
            </div>
            <div>
              <span className="text-gray-500">Call ID</span>
              <div className="font-mono">{receipt.callId}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
          }}
          className="btn btn-primary"
        >
          Copy Full Receipt JSON
        </button>
        {explorerUrls[receipt.chainId] && (
          <a
            href={`${explorerUrls[receipt.chainId]}/address/${receipt.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View Token on Explorer
          </a>
        )}
      </div>
    </div>
  );
}
