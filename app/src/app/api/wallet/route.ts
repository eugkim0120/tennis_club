import { NextRequest, NextResponse } from "next/server";
import { getUserBySession } from "@/lib/auth";
import { getOrCreateWallet, getTransactions, topUp, getPendingStakes } from "@/lib/wallet";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const wallet = getOrCreateWallet(user.id);
  const transactions = getTransactions(wallet.id);
  const pendingStakes = getPendingStakes(user.id);

  return NextResponse.json({ wallet, transactions, pending_stakes: pendingStakes });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = token ? getUserBySession(token) : null;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = body.amount ?? 50;
  if (amount < 1 || amount > 100) {
    return NextResponse.json({ error: "Top-up amount must be 1-100" }, { status: 400 });
  }

  const wallet = topUp(user.id, amount);
  return NextResponse.json(wallet);
}
