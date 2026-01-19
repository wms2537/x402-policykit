# x402 PolicyKit

A reusable toolkit for building HTTP 402 (Payment Required) APIs on Cloudflare Workers with **policy-based spending control** for AI agents.

## The Problem

AI agents need to call paid APIs, but without spending controls they can rack up unlimited costs. x402 PolicyKit provides:

- **Policy Engine**: Set daily/per-call spending caps, allowlists, and domain restrictions
- **Spend Tracking**: Real-time visibility into what your agents are spending
- **Decision Traces**: Human-readable explanations when payments are blocked
- **Receipt Logging**: Cryptographic proof of every payment

## Quick Start

### Add Paywall to a Worker Route (6 lines)

```typescript
import { withX402Paywall } from '@x402/worker';

const handler = withX402Paywall(myHandler, {
  sellerAddress: '0x...',
  defaultToken: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  defaultChainId: 84532,
  pricing: { '/api/tool': 0.05 },
});
```

### Use x402Fetch with Policy (8 lines)

```typescript
import { x402Fetch } from '@x402/client';

const response = await x402Fetch('https://api.example.com/tool', {
  method: 'POST',
  body: JSON.stringify({ data: 'test' }),
}, {
  policy: { dailyCapUsd: 1.0, perCallCapUsd: 0.10 },
  wallet: myWallet,
  callerId: 'agent-123',
});
```

## Architecture

```
x402-policykit/
  packages/
    policy-engine/       # Pure TS policy evaluator
    x402-client/         # x402Fetch + adapters
    x402-worker/         # withX402Paywall middleware
  apps/
    paywall-worker/      # Demo paid API (Cloudflare Worker)
    dashboard-web/       # Spend tracking UI (Next.js)
  db/
    schema.sql           # D1 database schema
```

## Packages

### @x402/policy-engine

Pure TypeScript policy evaluation engine. Define spending policies with JSON:

```typescript
const policy = {
  id: 'my-policy',
  name: 'Production Policy',
  dailyCapUsd: 2.0,
  perCallCapUsd: 0.15,
  allowTools: ['extract', 'quote', 'verify'],
  denyDomains: ['untrusted.com'],
  enabled: true,
};
```

Evaluate requests and get detailed decisions:

```typescript
import { evaluatePolicy } from '@x402/policy-engine';

const decision = evaluatePolicy(policy, request, spendContext);
// {
//   allow: false,
//   reason: "Price $0.25 exceeds per-call cap of $0.15",
//   ruleId: "per_call_cap",
//   projectedSpend: 1.25,
//   trace: [...] // Full evaluation trace
// }
```

### @x402/client

Fetch wrapper that handles the 402 → pay → retry flow automatically:

```typescript
import { x402Fetch, createMockWallet } from '@x402/client';

const wallet = createMockWallet('test-key');

const response = await x402Fetch(url, init, {
  policy,
  wallet,
  callerId: 'agent-1',
  onPolicyBlocked: (decision) => {
    console.log('Blocked:', decision.reason);
  },
});

if (response.x402Paid) {
  console.log('Receipt:', response.x402ReceiptId);
}
```

### @x402/worker

Middleware for protecting Cloudflare Worker routes:

```typescript
import { withX402Paywall } from '@x402/worker';

const config = {
  sellerAddress: env.SELLER_ADDRESS,
  defaultToken: env.TOKEN_ADDRESS,
  defaultChainId: 84532,
  pricing: {
    '/tool/extract': { priceUsd: 0.05, description: 'Extract data' },
    '/tool/quote': 0.03,
    '/tool/verify': 0.02,
  },
  db: env.DB, // D1 for receipts
  kv: env.NONCES, // KV for replay protection
};

export default {
  fetch: withX402Paywall(handler, config),
};
```

## 402 Protocol

When a client calls a paid endpoint without payment:

```http
HTTP/1.1 402 Payment Required
X-PRICE: 50000
X-PRICE-USD: 0.05
X-TOKEN: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
X-SELLER: 0x8765432109fedcba...
X-CHAIN-ID: 84532
X-EXPIRY: 1705662900
X-NONCE: nonce_abc123
```

The client generates a payment signature and retries:

```http
POST /tool/extract
X-PAYMENT: eyJzaWciOiIweDEyMzQ...
```

On success, the server returns:

```http
HTTP/1.1 200 OK
X-RECEIPT-ID: rcpt_xyz789
```

## Development

```bash
# Install dependencies
pnpm install

# Start both worker and dashboard
pnpm dev:all

# Or separately
pnpm dev:worker  # http://localhost:8787
pnpm dev         # http://localhost:3000

# Initialize D1 database (local)
pnpm db:init
```

## Deployment

```bash
# Build all packages
pnpm build:packages

# Deploy Worker
pnpm deploy:worker

# Deploy Dashboard
pnpm deploy:dashboard
```

## Database Schema

The D1 database tracks:

- **calls**: All API calls (paid and blocked attempts)
- **policy_decisions**: Full decision traces
- **receipts**: Payment proofs with request/response hashes
- **daily_spend**: Aggregated spending by caller

## Dashboard Features

- **Spend Dashboard**: Today's spend, weekly totals, budget usage
- **Live Demo**: Watch policy enforcement in real-time
- **Receipts**: View payment proofs with deterministic hashes
- **Policy Editor**: Configure policies with form or JSON

## "Wow" Moment

The key differentiator isn't "paid APIs" - it's **Policy + Observability for agent spending**.

Demo flow (2 minutes):
1. Set policy: daily $1, per call $0.10
2. Run agent workflow (3 tool calls succeed)
3. Trigger overspend: $0.25 call gets blocked
4. Open dashboard: see the blocked call with reason
5. Open receipt: see deterministic hashes + payment proof

This is the production feature missing from most x402 demos.

## License

MIT
