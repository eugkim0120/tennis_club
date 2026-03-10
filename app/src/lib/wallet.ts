import { getDb } from "./db";
import crypto from "crypto";

const uuid = () => crypto.randomUUID();

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export function getOrCreateWallet(userId: string): Wallet {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM wallets WHERE user_id = ?").get(userId) as Wallet | undefined;
  if (existing) return existing;

  const id = uuid();
  db.prepare("INSERT INTO wallets (id, user_id, balance) VALUES (?, ?, 100)").run(id, userId);

  // Record initial credit
  db.prepare(
    "INSERT INTO wallet_transactions (id, wallet_id, amount, type, description) VALUES (?, ?, 100, 'initial', 'Welcome bonus')"
  ).run(uuid(), id);

  return db.prepare("SELECT * FROM wallets WHERE id = ?").get(id) as Wallet;
}

export function getWalletByUserId(userId: string): Wallet | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM wallets WHERE user_id = ?").get(userId) as Wallet) ?? null;
}

export function getTransactions(walletId: string, limit = 20): WalletTransaction[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(walletId, limit) as WalletTransaction[];
}

export function stakeCredits(userId: string, amount: number, referenceId: string, description: string): boolean {
  const db = getDb();
  const wallet = getOrCreateWallet(userId);
  if (wallet.balance < amount) return false;

  db.prepare("UPDATE wallets SET balance = balance - ? WHERE id = ?").run(amount, wallet.id);
  db.prepare(
    "INSERT INTO wallet_transactions (id, wallet_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'stake', ?, ?)"
  ).run(uuid(), wallet.id, -amount, referenceId, description);

  return true;
}

export function refundCredits(userId: string, amount: number, referenceId: string, description: string): void {
  const db = getDb();
  const wallet = getOrCreateWallet(userId);

  db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(amount, wallet.id);
  db.prepare(
    "INSERT INTO wallet_transactions (id, wallet_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'refund', ?, ?)"
  ).run(uuid(), wallet.id, amount, referenceId, description);
}

export function penalizeCredits(userId: string, amount: number, referenceId: string, description: string): void {
  const db = getDb();
  const wallet = getOrCreateWallet(userId);

  db.prepare(
    "INSERT INTO wallet_transactions (id, wallet_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'penalty', ?, ?)"
  ).run(uuid(), wallet.id, -amount, referenceId, description);
}

export function bonusCredits(userId: string, amount: number, referenceId: string, description: string): void {
  const db = getDb();
  const wallet = getOrCreateWallet(userId);

  db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(amount, wallet.id);
  db.prepare(
    "INSERT INTO wallet_transactions (id, wallet_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'bonus', ?, ?)"
  ).run(uuid(), wallet.id, amount, referenceId, description);
}

export function topUp(userId: string, amount: number): Wallet {
  const db = getDb();
  const wallet = getOrCreateWallet(userId);

  db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(amount, wallet.id);
  db.prepare(
    "INSERT INTO wallet_transactions (id, wallet_id, amount, type, description) VALUES (?, ?, ?, 'topup', 'Credit top-up')"
  ).run(uuid(), wallet.id, amount);

  return db.prepare("SELECT * FROM wallets WHERE id = ?").get(wallet.id) as Wallet;
}

export function getPendingStakes(userId: string): number {
  const db = getDb();
  const wallet = getOrCreateWallet(userId);
  const result = db.prepare(
    "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM wallet_transactions WHERE wallet_id = ? AND type = 'stake' AND reference_id IN (SELECT id FROM groups WHERE status IN ('forming', 'ready', 'booked'))"
  ).get(wallet.id) as { total: number };
  return result.total;
}
