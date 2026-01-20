# Demo Video Script (2 minutes)

## Recording Tips
- Screen resolution: 1920x1080
- Font size: Large enough to read
- Browser: Chrome (dark mode)
- Have terminal and browser side by side

---

## Script

### Opening (0:00 - 0:15)

**[Show slide or README]**

> "x402 PolicyKit - spending controls for AI agents.
>
> The problem: AI agents calling paid APIs can rack up unlimited costs.
> Our solution: Policy-based enforcement that blocks overspending BEFORE payment."

---

### Show the Demo App (0:15 - 0:30)

**[Navigate to http://localhost:3000/demo]**

> "Here's our demo app. On the left, we have a policy:
> - Daily cap: $1.00
> - Per-call cap: $0.10
>
> On the right, we'll run an agent workflow and watch what happens."

---

### Run the Workflow (0:30 - 1:00)

**[Click "Run Demo Workflow" button]**

> "Let's run the workflow."

**[Point to each call as it appears]**

> "First call: /tool/quote for 3 cents - policy allows it, payment goes through.
>
> Second: /tool/extract for 5 cents - still within budget, payment succeeds.
>
> Third: /tool/verify for 2 cents - we're now at 10 cents total.
>
> **Fourth call** - watch this one carefully..."

**[Point to the blocked call]**

> "This extract call costs 25 cents. The policy engine BLOCKS it before any payment happens.
>
> Look at the reason: 'Price $0.25 exceeds per-call cap of $0.10'
>
> The agent didn't overspend - the policy stopped it."

---

### Show the Dashboard (1:00 - 1:20)

**[Navigate to http://localhost:3000]**

> "Now let's look at the dashboard.
>
> Today's spend: $0.10 - that's our 3 successful calls.
> Blocked calls: 1 - the expensive call we just saw.
>
> The progress bar shows we've used 10% of our daily budget."

---

### Show a Receipt (1:20 - 1:40)

**[Click on a receipt in Recent Activity or navigate to /receipts]**

> "Every paid call gets a receipt with cryptographic proof.
>
> Here's the request hash - a deterministic hash of what the agent asked for.
> And the response hash - proof of what the API returned.
>
> This is auditable evidence for agent spending."

---

### Show the Code (1:40 - 1:55)

**[Show code snippet - can be a slide or the README]**

> "Integration is simple.
>
> For sellers: 6 lines to add paywall to a Worker route.
> For buyers: 8 lines to make paid calls with policy enforcement.
>
> Policies are just JSON - easy to version control and share."

---

### Closing (1:55 - 2:00)

**[Show README or final slide]**

> "x402 PolicyKit - Policy, Observability, and Receipts for agent spending.
>
> Check out the repo. Thanks!"

---

## Key Points to Hit

1. **Problem** - Agents can overspend
2. **Solution** - Policy enforcement BEFORE payment
3. **Demo** - Show a blocked call with reason
4. **Dashboard** - Show spend visibility
5. **Receipts** - Show cryptographic proof
6. **Simple** - 6 lines / 8 lines integration

---

## Fallback: Static Demo

If the live demo doesn't work, the `/demo` page has mock data that demonstrates the same flow without needing the Worker running.
