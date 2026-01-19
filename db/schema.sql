-- x402 PolicyKit Database Schema
-- For Cloudflare D1

-- Store all API calls (paid and unpaid attempts)
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  caller_id TEXT,
  price_usd REAL NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  payment_ref TEXT,
  request_hash TEXT,
  response_hash TEXT,
  status_code INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  INDEX idx_calls_caller (caller_id),
  INDEX idx_calls_endpoint (endpoint),
  INDEX idx_calls_created (created_at)
);

-- Store policy decisions for each call
CREATE TABLE IF NOT EXISTS policy_decisions (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  projected_spend_usd REAL NOT NULL,
  daily_spent_usd REAL NOT NULL,
  weekly_spent_usd REAL NOT NULL,
  policy_snapshot TEXT, -- JSON of policy at decision time
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id)
);

-- Store payment receipts with proof
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  payment_ref TEXT NOT NULL UNIQUE,
  amount_usd REAL NOT NULL,
  token_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  seller_address TEXT NOT NULL,
  buyer_address TEXT,
  tx_hash TEXT, -- on-chain tx if submitted
  nonce TEXT NOT NULL,
  expiry TEXT NOT NULL,
  signature TEXT NOT NULL,
  request_hash TEXT,
  response_hash TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (call_id) REFERENCES calls(id)
);

-- Aggregated spend tracking per caller per day
CREATE TABLE IF NOT EXISTS daily_spend (
  id TEXT PRIMARY KEY,
  caller_id TEXT NOT NULL,
  date TEXT NOT NULL,
  total_usd REAL NOT NULL DEFAULT 0,
  call_count INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(caller_id, date)
);

-- Pricing configuration for endpoints
CREATE TABLE IF NOT EXISTS pricing (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  price_usd REAL NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_policy_decisions_call ON policy_decisions(call_id);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_allowed ON policy_decisions(allowed);
CREATE INDEX IF NOT EXISTS idx_receipts_call ON receipts(call_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_ref ON receipts(payment_ref);
CREATE INDEX IF NOT EXISTS idx_daily_spend_caller ON daily_spend(caller_id);
CREATE INDEX IF NOT EXISTS idx_daily_spend_date ON daily_spend(date);

-- Seed initial pricing
INSERT OR REPLACE INTO pricing (id, endpoint, price_usd, description) VALUES
  ('price_extract', '/tool/extract', 0.05, 'Extract structured data from content'),
  ('price_quote', '/tool/quote', 0.03, 'Generate a price quote'),
  ('price_verify', '/tool/verify', 0.02, 'Verify data integrity');
