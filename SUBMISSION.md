# x402 PolicyKit - Hackathon Submission

## Cronos x402 PayTech Hackathon

**Prize Track:** Best Dev Tooling / Virtualization Layer ($3,000)

**Project Name:** x402 PolicyKit

**Tagline:** Policy-based spending control for AI agents using the x402 payment protocol

---

## One-Liner

A reusable toolkit that turns any Cloudflare Worker into an x402-paid endpoint with policy caps, spend traces, and cryptographic receipts - giving teams production-ready observability for agent spending.

---

## Problem

AI agents need to call paid APIs autonomously, but without spending controls they can rack up unlimited costs. Existing x402 implementations focus on the payment flow but lack:

1. **Budget enforcement** - No per-call or daily spending caps
2. **Visibility** - No way to see what agents are spending or why
3. **Audit trail** - No proof of what was requested/returned
4. **Easy integration** - Complex setup for both sellers and buyers

---

## Solution

**x402 PolicyKit** provides three packages:

### 1. @x402/worker - Seller Middleware

Add paywall to any Worker route in **6 lines**:

```typescript
import { withX402Paywall } from '@x402/worker';

export default {
  fetch: withX402Paywall(myHandler, {
    sellerAddress: '0x...',
    pricing: { '/api/tool': 0.05 },
  }),
};
```

### 2. @x402/client - Buyer Wrapper

Make paid calls with policy enforcement in **8 lines**:

```typescript
import { x402Fetch } from '@x402/client';

const response = await x402Fetch(url, { method: 'POST' }, {
  policy: { dailyCapUsd: 1.0, perCallCapUsd: 0.10 },
  wallet: myWallet,
  callerId: 'agent-123',
});
```

### 3. @x402/policy-engine - Pure TypeScript

Define spending policies with JSON:

```json
{
  "dailyCapUsd": 2.0,
  "perCallCapUsd": 0.15,
  "allowTools": ["extract", "quote", "verify"],
  "denyDomains": ["untrusted.com"]
}
```

---

## Key Differentiator

**Policy + Observability for agent spending** - not just "paid APIs"

| Feature | Other x402 Demos | PolicyKit |
|---------|------------------|-----------|
| 402 payment flow | Yes | Yes |
| Spending caps | No | **Daily, weekly, per-call** |
| Policy enforcement | No | **Block BEFORE payment** |
| Decision traces | No | **Human-readable reasons** |
| Receipt hashes | No | **Request + response proof** |
| Dashboard | No | **Real-time spend tracking** |

---

## Demo Flow (2 minutes)

1. **Configure policy**: Daily $1, per-call $0.10
2. **Run agent workflow**:
   - `/tool/quote` ($0.03) - Paid
   - `/tool/extract` ($0.05) - Paid
   - `/tool/verify` ($0.02) - Paid
3. **Trigger overspend**: `/tool/extract` ($0.25) - **BLOCKED**
   - Shows: "Price $0.25 exceeds per-call cap of $0.10"
   - No payment made - blocked at policy layer
4. **View dashboard**: See all calls, spend totals, blocked attempts
5. **View receipt**: See deterministic request/response hashes

---

## Architecture

```
x402-policykit/
├── packages/
│   ├── policy-engine/     # Pure TS, reusable anywhere
│   ├── x402-client/       # x402Fetch + policy evaluation
│   └── x402-worker/       # withX402Paywall middleware
├── apps/
│   ├── paywall-worker/    # Demo: Cloudflare Worker with paid tools
│   └── dashboard-web/     # Demo: Next.js spend tracking UI
└── db/
    └── schema.sql         # D1 schema for receipts
```

---

## x402 Protocol Compliance

Implements official x402 protocol headers:

| Header | Direction | Format |
|--------|-----------|--------|
| `PAYMENT-REQUIRED` | Server → Client | Base64 JSON (PaymentRequired) |
| `PAYMENT-SIGNATURE` | Client → Server | Base64 JSON (PaymentPayload) |
| `PAYMENT-RESPONSE` | Server → Client | Base64 JSON (settlement proof) |

Uses CAIP-2 network identifiers:
- Base Sepolia: `eip155:84532`
- Cronos Mainnet: `eip155:25`
- Cronos Testnet: `eip155:338`

---

## Supported Chains

| Chain | CAIP-2 | USDC Address | Facilitator |
|-------|--------|--------------|-------------|
| Base Sepolia | eip155:84532 | 0x036CbD53... | Coinbase |
| Base Mainnet | eip155:8453 | 0x833589f... | Coinbase |
| Cronos Mainnet | eip155:25 | 0xc212232... | Custom |
| Cronos Testnet | eip155:338 | 0x6a31736... | Custom |

---

## Tech Stack

- **Runtime**: Cloudflare Workers (edge)
- **Database**: Cloudflare D1 (SQLite)
- **KV**: Cloudflare KV (nonce tracking)
- **Frontend**: Next.js 15 + React 19
- **Styling**: Tailwind CSS
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm workspaces

---

## Why Dev Tooling Track?

This submission is **infrastructure for building x402 applications**, not an application itself:

1. **Reusable packages** - npm installable, works with any framework
2. **6-line integration** - Minimal code to add paywall
3. **Policy DSL** - JSON configuration for spending rules
4. **Framework agnostic** - Works with Express, Hono, bare Workers
5. **Database migrations** - Ready-to-use D1 schema

---

## Future Roadmap

1. **Facilitator integration** - Connect to Coinbase facilitator for settlement
2. **On-chain receipts** - Optional event emission for audit
3. **Multi-tenant policies** - Different policies per API key
4. **Analytics dashboard** - Historical spend analysis
5. **Alerting** - Webhook notifications for budget thresholds

---

## Links

- **GitHub**: [Repository URL]
- **Demo Video**: [Video URL]
- **Live Demo**: [Deployed URL if applicable]

---

## Team

[Your team information]

---

## Contact

[Your contact information]
