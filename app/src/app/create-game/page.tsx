"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateGamePage() {
  const router = useRouter();
  const [auth, setAuth] = useState<{ user: { id: string } | null; profile_id: string | null }>({ user: null, profile_id: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [joinMode, setJoinMode] = useState<"open" | "approval">("open");
  const [stakeAmount, setStakeAmount] = useState(10);
  const [minSkill, setMinSkill] = useState(1.0);
  const [maxSkill, setMaxSkill] = useState(5.0);
  const [minReliability, setMinReliability] = useState(0);
  const [maxMembers, setMaxMembers] = useState(4);
  const [sport, setSport] = useState("tennis");
  const [sports, setSports] = useState<{id: string; name: string; icon: string}[]>([]);

  useEffect(() => {
    fetch("/api/sports").then(r => r.ok ? r.json() : []).then(setSports);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => {
      if (!d) { router.push("/login"); return; }
      setAuth(d);
      if (!d.profile_id) { router.push("/profile"); }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, city, description,
        scheduled_time: scheduledTime || undefined,
        join_mode: joinMode,
        stake_amount: stakeAmount,
        min_skill: minSkill,
        max_skill: maxSkill,
        min_reliability: minReliability / 100,
        max_members: maxMembers,
        sport,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }

    router.push("/games");
  }

  if (!auth.user) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create a Game</h1>
        <p className="text-sm text-slate-500 mt-0.5">Set your requirements and stake. Credits are deducted when you create.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
        {error && (
          <div className="bg-red-50 border border-red-200/60 text-red-600 px-4 py-2.5 rounded-xl mb-4 text-sm font-medium">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Game Title</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="e.g. Saturday doubles at Central Park" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <input type="text" required value={city} onChange={e => setCity(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="Austin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date & Time</label>
              <input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              placeholder="Any details about the game..." />
          </div>

          {/* Stake & Join Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Stake Amount
                <span className="text-slate-400 font-normal ml-1">(credits)</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="range" min={5} max={25} value={stakeAmount} onChange={e => setStakeAmount(Number(e.target.value))}
                  className="flex-1 accent-emerald-600" />
                <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/50 min-w-[40px] text-center">{stakeAmount}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Join Mode</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setJoinMode("open")}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${joinMode === "open" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  Open
                </button>
                <button type="button" onClick={() => setJoinMode("approval")}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${joinMode === "approval" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  Approval
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Min Skill</label>
              <select value={minSkill} onChange={e => setMinSkill(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Skill</label>
              <select value={maxSkill} onChange={e => setMaxSkill(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Players</label>
              <select value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                <option value={2}>2 (Singles)</option>
                <option value={4}>4 (Doubles)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Min Reliability: {minReliability}%</label>
            <input type="range" min={0} max={100} step={5} value={minReliability} onChange={e => setMinReliability(Number(e.target.value))}
              className="w-full accent-emerald-600" />
            <p className="text-[11px] text-slate-400 mt-1">Higher = only players who consistently show up</p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm">
            {loading ? "Creating..." : `Create Game · Stake ${stakeAmount} credits`}
          </button>
        </form>
      </div>
    </div>
  );
}
