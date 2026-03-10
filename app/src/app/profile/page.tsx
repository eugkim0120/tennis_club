"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  name: string;
  age: number;
  languages: string[];
  skill_level: number;
  city: string | null;
  bio: string;
  reliability_score: number;
  games_played: number;
  games_attended: number;
  preferred_age_min: number;
  preferred_age_max: number;
  preferred_skill_min: number;
  preferred_skill_max: number;
}

interface WalletInfo {
  wallet: { balance: number };
  transactions: { id: string; amount: number; type: string; description: string; created_at: string }[];
  pending_stakes: number;
}

function skillLabel(s: number) {
  if (s <= 1.5) return "Beginner";
  if (s <= 2.5) return "Intermediate";
  if (s <= 3.5) return "Advanced";
  if (s <= 4.5) return "Expert";
  return "Pro";
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [form, setForm] = useState({
    name: "", age: 25, languages: "English", skill_level: 3.0,
    city: "", bio: "",
    preferred_age_min: 18, preferred_age_max: 50,
    preferred_skill_min: 1.0, preferred_skill_max: 5.0,
  });

  useEffect(() => {
    fetch("/api/auth/me").then(r => {
      if (!r.ok) { router.push("/login"); return; }
      return r.json();
    }).then(async (data) => {
      if (!data) return;
      // Load wallet
      fetch("/api/wallet").then(r => r.ok ? r.json() : null).then(w => { if (w) setWalletInfo(w); });

      if (data.profile_id) {
        const res = await fetch(`/api/profiles/${data.profile_id}`);
        if (res.ok) { setProfile(await res.json()); setHasProfile(true); }
      } else {
        setHasProfile(false);
      }
    });
  }, [router]);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        languages: form.languages.split(",").map(l => l.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.details ? data.details.map((d: { message: string }) => d.message).join(", ") : data.error);
      setSaving(false);
      return;
    }
    setProfile(data);
    setHasProfile(true);
    setSaving(false);
  }

  async function handleTopUp() {
    setToppingUp(true);
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 50 }),
    });
    if (res.ok) {
      const wallet = await res.json();
      setWalletInfo(prev => prev ? { ...prev, wallet } : null);
    }
    setToppingUp(false);
  }

  if (hasProfile === null) return <div className="text-center py-16 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profile</h1>

      {/* Wallet Card */}
      {walletInfo && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-2xl border border-amber-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Your Wallet</p>
              <p className="text-3xl font-bold text-amber-800">{walletInfo.wallet.balance} <span className="text-base font-medium">credits</span></p>
            </div>
            <button onClick={handleTopUp} disabled={toppingUp}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-all disabled:opacity-50 shadow-sm">
              {toppingUp ? "..." : "+ Top Up 50"}
            </button>
          </div>
          {walletInfo.pending_stakes > 0 && (
            <p className="text-xs text-amber-600">{walletInfo.pending_stakes} credits currently staked in active games</p>
          )}
          {walletInfo.transactions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-200/50">
              <p className="text-xs text-amber-600 font-semibold mb-2">Recent Transactions</p>
              <div className="space-y-1">
                {walletInfo.transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex justify-between text-xs">
                    <span className="text-amber-700">{tx.description || tx.type}</span>
                    <span className={`font-semibold ${tx.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>{tx.amount >= 0 ? "+" : ""}{tx.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Card */}
      {profile ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 font-bold text-xl">
                {profile.name[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
                <p className="text-sm text-slate-500">{profile.age} years old &middot; {profile.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">{skillLabel(profile.skill_level)} ({profile.skill_level})</span>
            </div>
          </div>
<<<<<<< Updated upstream
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              <input type="number" min={13} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: +e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
=======

          {profile.bio && <p className="text-sm text-slate-600 mb-4">{profile.bio}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Reliability</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.round(profile.reliability_score * 100)}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-700">{Math.round(profile.reliability_score * 100)}%</span>
              </div>
>>>>>>> Stashed changes
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Games</p>
              <p className="text-sm font-bold text-slate-700">{profile.games_attended}/{profile.games_played} attended</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5">
              {profile.languages.map(l => (
                <span key={l} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-medium">{l}</span>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Prefers ages {profile.preferred_age_min}-{profile.preferred_age_max} &middot; Skill {profile.preferred_skill_min}-{profile.preferred_skill_max}
            </p>
          </div>
<<<<<<< Updated upstream
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} maxLength={500} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
=======
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Create Your Profile</h2>
          {error && (
            <div className="bg-red-50 border border-red-200/60 text-red-600 px-4 py-2.5 rounded-xl mb-4 text-sm font-medium">{error}</div>
          )}
          <form onSubmit={createProfile} className="space-y-4">
>>>>>>> Stashed changes
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Age</label>
                <input type="number" min={13} max={120} value={form.age} onChange={e => setForm({ ...form, age: +e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Skill Level (1-5)</label>
                <input type="number" min={1} max={5} step={0.5} value={form.skill_level} onChange={e => setForm({ ...form, skill_level: +e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Languages</label>
                <input type="text" value={form.languages} onChange={e => setForm({ ...form, languages: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="English, Spanish" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input type="text" required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={2} maxLength={500}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none" />
            </div>
<<<<<<< Updated upstream
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Preferred Skill Min</label>
              <input type="number" min={1} max={5} step={0.5} value={form.preferred_skill_min} onChange={(e) => setForm({ ...form, preferred_skill_min: +e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preferred Skill Max</label>
              <input type="number" min={1} max={5} step={0.5} value={form.preferred_skill_max} onChange={(e) => setForm({ ...form, preferred_skill_max: +e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
            {saving ? "Creating..." : "Create Profile"}
          </button>
        </form>
      </div>
=======
            <button type="submit" disabled={saving}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm text-sm">
              {saving ? "Creating..." : "Create Profile"}
            </button>
          </form>
        </div>
      )}
>>>>>>> Stashed changes
    </div>
  );
}
