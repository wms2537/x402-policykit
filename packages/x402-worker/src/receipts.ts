/**
 * x402 Receipt Storage and Retrieval
 */

import type { Receipt } from './types';
import { generateId } from '@x402/policy-engine';

/**
 * Store a receipt in D1
 */
export async function storeReceipt(
  db: D1Database,
  receipt: Receipt
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO receipts (
        id, call_id, payment_ref, amount_usd, token_address, chain_id,
        seller_address, buyer_address, nonce, expiry, signature,
        request_hash, response_hash, tx_hash, verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      receipt.id,
      receipt.callId,
      receipt.paymentRef,
      receipt.amountUsd,
      receipt.token,
      receipt.chainId,
      receipt.seller,
      receipt.buyer,
      receipt.nonce,
      receipt.expiry,
      receipt.signature,
      receipt.requestHash,
      receipt.responseHash,
      receipt.txHash ?? null,
      receipt.verified ? 1 : 0,
      receipt.createdAt
    )
    .run();
}

/**
 * Get a receipt by ID
 */
export async function getReceipt(
  db: D1Database,
  id: string
): Promise<Receipt | null> {
  const result = await db
    .prepare('SELECT * FROM receipts WHERE id = ?')
    .bind(id)
    .first<DbReceipt>();

  if (!result) return null;
  return dbToReceipt(result);
}

/**
 * Get receipts for a caller
 */
export async function getReceiptsForCaller(
  db: D1Database,
  buyerAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<Receipt[]> {
  const result = await db
    .prepare(
      `SELECT * FROM receipts
       WHERE buyer_address = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(buyerAddress, limit, offset)
    .all<DbReceipt>();

  return (result.results ?? []).map(dbToReceipt);
}

/**
 * Get recent receipts
 */
export async function getRecentReceipts(
  db: D1Database,
  limit: number = 50
): Promise<Receipt[]> {
  const result = await db
    .prepare(
      `SELECT * FROM receipts
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<DbReceipt>();

  return (result.results ?? []).map(dbToReceipt);
}

/**
 * Get receipt by payment reference
 */
export async function getReceiptByPaymentRef(
  db: D1Database,
  paymentRef: string
): Promise<Receipt | null> {
  const result = await db
    .prepare('SELECT * FROM receipts WHERE payment_ref = ?')
    .bind(paymentRef)
    .first<DbReceipt>();

  if (!result) return null;
  return dbToReceipt(result);
}

/**
 * Get total receipts count
 */
export async function getReceiptsCount(db: D1Database): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM receipts')
    .first<{ count: number }>();

  return result?.count ?? 0;
}

/**
 * Get receipts statistics
 */
export async function getReceiptsStats(db: D1Database): Promise<{
  totalReceipts: number;
  totalAmountUsd: number;
  uniqueBuyers: number;
  todayReceipts: number;
  todayAmountUsd: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const [total, unique, todayStats] = await Promise.all([
    db
      .prepare('SELECT COUNT(*) as count, SUM(amount_usd) as total FROM receipts')
      .first<{ count: number; total: number }>(),
    db
      .prepare('SELECT COUNT(DISTINCT buyer_address) as count FROM receipts')
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) as count, SUM(amount_usd) as total
         FROM receipts WHERE date(created_at) = ?`
      )
      .bind(today)
      .first<{ count: number; total: number }>(),
  ]);

  return {
    totalReceipts: total?.count ?? 0,
    totalAmountUsd: total?.total ?? 0,
    uniqueBuyers: unique?.count ?? 0,
    todayReceipts: todayStats?.count ?? 0,
    todayAmountUsd: todayStats?.total ?? 0,
  };
}

// Database row type
interface DbReceipt {
  id: string;
  call_id: string;
  payment_ref: string;
  amount_usd: number;
  token_address: string;
  chain_id: number;
  seller_address: string;
  buyer_address: string;
  nonce: string;
  expiry: string;
  signature: string;
  request_hash: string;
  response_hash: string;
  tx_hash: string | null;
  verified: number;
  created_at: string;
}

// Convert database row to Receipt
function dbToReceipt(row: DbReceipt): Receipt {
  return {
    id: row.id,
    callId: row.call_id,
    paymentRef: row.payment_ref,
    amountUsd: row.amount_usd,
    token: row.token_address,
    chainId: row.chain_id,
    seller: row.seller_address,
    buyer: row.buyer_address,
    nonce: row.nonce,
    expiry: row.expiry,
    signature: row.signature,
    requestHash: row.request_hash,
    responseHash: row.response_hash,
    txHash: row.tx_hash ?? undefined,
    verified: row.verified === 1,
    createdAt: row.created_at,
  };
}

/**
 * Create a receipt export (for spend reports)
 */
export function exportReceiptsToJson(receipts: Receipt[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: receipts.length,
      totalUsd: receipts.reduce((sum, r) => sum + r.amountUsd, 0),
      receipts: receipts.map(r => ({
        id: r.id,
        amount: r.amountUsd,
        buyer: r.buyer,
        seller: r.seller,
        requestHash: r.requestHash,
        responseHash: r.responseHash,
        txHash: r.txHash,
        createdAt: r.createdAt,
      })),
    },
    null,
    2
  );
}
