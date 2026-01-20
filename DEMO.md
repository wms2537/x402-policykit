# x402 PolicyKit Demo Script

This document describes how to run the x402 PolicyKit demo for the Dev Tooling submission.

## Setup (2 minutes)

1. **Clone and install**:
   ```bash
   git clone https://github.com/your-org/x402-policykit
   cd x402-policykit
   pnpm install
   ```

2. **Start the services**:
   ```bash
   # Terminal 1: Start the paywall worker
   pnpm dev:worker
   # Running at http://localhost:8787

   # Terminal 2: Start the dashboard
   pnpm dev
   # Running at http://localhost:3000
   ```

3. **Open the dashboard** at http://localhost:3000

## Demo Flow (2 minutes)

### Step 1: Show the Policy Configuration

Navigate to http://localhost:3000/demo

1. Point out the **Policy Configuration** panel on the left:
   - Daily Cap: $1.00
   - Per-Call Cap: $0.10

2. Explain: "This policy says the agent can spend at most $1/day, and no single call can cost more than 10 cents."

### Step 2: Run the Agent Workflow

Click **"Run Demo Workflow"**

Watch the **Call Log** populate in real-time:

1. **Quote** ($0.03) - Green "paid" badge
   - "Policy rules passed"

2. **Extract** ($0.05) - Green "paid" badge
   - Current spend updates to $0.08

3. **Verify** ($0.02) - Green "paid" badge
   - Current spend updates to $0.10

4. **Extract (Expensive)** ($0.25) - Red "blocked" badge
   - Shows: "Price $0.25 exceeds per-call cap of $0.10"
   - Note: The payment was blocked BEFORE it was made

### Step 3: Highlight the Key Feature

Point to the blocked call:

> "This is the 'wow' moment. The agent tried to make a $0.25 call, but the policy engine blocked it before any payment was made. You can see exactly WHY it was blocked - the per-call cap."

### Step 4: Show the Dashboard

Navigate to http://localhost:3000

1. **Today's Spend**: Shows $0.10 (the 3 successful calls)
2. **Progress bar**: 10% of $1.00 daily cap
3. **Blocked Calls**: Shows 1 blocked
4. **Recent Activity**: Shows all 4 calls with status

### Step 5: Show a Receipt

Navigate to http://localhost:3000/receipts

Click on any receipt to show:

1. **Amount**: $0.05
2. **Request Hash**: Deterministic hash of the API request
3. **Response Hash**: Deterministic hash of the API response
4. **Payment Signature**: Cryptographic proof

> "This receipt provides cryptographic proof of exactly what was requested and what was returned. This is auditable evidence for agent spending."

### Step 6: Show the Policy Editor

Navigate to http://localhost:3000/policy

1. Show the form-based editor
2. Toggle to **JSON View** to show the policy DSL:

```json
{
  "id": "default",
  "name": "Default Policy",
  "dailyCapUsd": 1.0,
  "perCallCapUsd": 0.10,
  "allowTools": ["extract", "quote", "verify"],
  "denyDomains": ["example-bad.com"],
  "enabled": true
}
```

> "Policies are just JSON. You can version control them, share them, and apply them across multiple agents."

## Key Points to Emphasize

1. **Policy-first**: Payments are evaluated BEFORE they're made
2. **Human-readable reasons**: "Exceeds per-call cap" not just "blocked"
3. **Full trace**: Every decision can be debugged
4. **Deterministic hashes**: Auditable proof of what happened
5. **Simple integration**: 6 lines for seller, 8 lines for buyer

## API Endpoints (for technical questions)

The paywall worker exposes:

- `GET /catalog` - Free: List tools + prices
- `POST /tool/extract` - Paid: $0.05
- `POST /tool/quote` - Paid: $0.03
- `POST /tool/verify` - Paid: $0.02

Example 402 response:
```
HTTP/1.1 402 Payment Required
X-PRICE: 50000
X-PRICE-USD: 0.05
X-TOKEN: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
X-CHAIN-ID: 84532
X-NONCE: nonce_abc123
```

## Common Questions

**Q: How is this different from just checking budgets server-side?**

A: The client-side policy engine gives the buyer control. The buyer sets their own limits, not the seller. This is like having a corporate credit card with spending limits.

**Q: What if the seller lies about prices?**

A: The 402 response includes the price, and the payment proof includes the amount. If the seller's price doesn't match, the buyer's policy engine will reject it.

**Q: Is this real blockchain payment?**

A: The toolkit supports real on-chain payments via signature-based authorization. For the demo we use mock signatures, but the protocol is the same.

**Q: What chains are supported?**

A: Any EVM chain. The demo uses Base Sepolia (chainId 84532) with USDC.

## Files to Show (if asked for code)

1. **Policy evaluation**: `packages/policy-engine/src/evaluator.ts`
2. **402 middleware**: `packages/x402-worker/src/middleware.ts`
3. **Client fetch**: `packages/x402-client/src/x402-fetch.ts`
4. **Database schema**: `db/schema.sql`
