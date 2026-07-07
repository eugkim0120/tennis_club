"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SportBadge from "@/components/SportBadge";

interface GroupMember {
  profile_id: string;
  name: string;
  skill_level: number;
  reliability_score: number;
}

interface GameGroup {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  city: string;
  status: string;
  join_mode: string;
  stake_amount: number;
  min_skill: number;
  max_skill: number;
  min_reliability: number;
  max_members: number;
  scheduled_time: string | null;
  members: GroupMember[];
}

function skillLabel(s: number) {
  if (s <= 1.5) return "Beginner";
  if (s <= 2.5) return "Intermediate";
  if (s <= 3.5) return "Advanced";
  if (s <= 4.5) return "Expert";
  return "Pro";
}

export default function BrowsePage() {
  const [groups, setGroups] = useState<GameGroup[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [sport, setSport] = useState("");
  const [sports, setSports] = useState<{id: string; name: string; icon: string}[]>([]);
  const [auth, setAuth] = useState<{ user: { id: string } | null; profile_id: string | null }>({ user: null, profile_id: null });
  
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => { if (d) setAuth(d); });
    loadGroups();
    fetch("/api/sports").then(r => r.ok ? r.json() : []).then(setSports);
  }, []);

  async function loadGroups(city?: string, sportFilter?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (sportFilter) params.set("sport", sportFilter);
    const qs = params.toString();
    const url = qs ? `/api/groups?${qs}` : "/api/groups";
    const res = await fetch(url);
    if (res.ok) setGroups(await res.json());
    setLoading(false);
  }

  async function joinGame(groupId: string) {
    if (!auth.user) { window.location.href = "/login"; return; }
    setJoining(groupId);
    const res = await fetch(`/api/groups/${groupId}/apply`, { method: "POST" });
    if (res.ok) await loadGroups(cityFilter || undefined);
    else {
      const data = await res.json();
      alert(data.error);
    }
    setJoining(null);
  }

  return (
    <div className="space-y-6">
      {/* Sport filter */}
      {sports.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setSport(""); loadGroups(cityFilter || undefined, ""); }}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              sport === "" ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >All</button>
          {sports.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSport(s.id); loadGroups(cityFilter || undefined, s.id); }}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                sport === s.id ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >{s.icon} {s.name}</button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Browse Games</h1>
          <p className="text-sm text-slate-500 mt-0.5">Find open games near you and join with a credit stake</p>
        </div>
        <Link href="/create-game" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm">
          + Create Game
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <input
          type="text" value={cityFilter} onChange={e => setCityFilter(e.target.value)}
          placeholder="Filter by city..."
          className="flex-1 max-w-xs border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        <button onClick={() => loadGroups(cityFilter || undefined)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
          Search
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading games...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">&#127934;</div>
          <p className="text-slate-500 font-medium">No open games found</p>
          <p className="text-sm text-slate-400 mt-1">Be the first to create one!</p>
          <Link href="/create-game" className="inline-block mt-4 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all">
            Create Game
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => {
            const isMember = g.members.some(m => m.profile_id === auth.profile_id);
            const isFull = g.members.length >= g.max_members;
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-slate-200/60 p-5 hover:border-emerald-200 transition-all hover:shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(g as any).sport && <SportBadge sport={(g as any).sport} />}
                    <h3 className="font-semibold text-slate-900">{g.title || `Game in ${g.city}`}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400">{g.city}{g.scheduled_time ? ` · ${new Date(g.scheduled_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}</p>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[11px] font-semibold border border-amber-200/50">
                      {g.stake_amount} credits
                    </span>
                  </div>
                </div>

                {g.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{g.description}</p>}

                {/* Filters */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-medium">
                    Skill: {skillLabel(g.min_skill)}-{skillLabel(g.max_skill)}
                  </span>
                  {g.min_reliability > 0 && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-medium">
                      Reliability: {Math.round(g.min_reliability * 100)}%+
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-medium">
                    {g.join_mode === "approval" ? "Approval required" : "Open join"}
                  </span>
                </div>

                {/* Members */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-2">
                      {g.members.slice(0, 4).map((m, i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-emerald-700">
                          {m.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{g.members.length}/{g.max_members} players</span>
                  </div>

                  {isMember ? (
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">Joined</span>
                  ) : isFull ? (
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-semibold">Full</span>
                  ) : (
                    <button
                      onClick={() => joinGame(g.id)}
                      disabled={joining === g.id}
                      className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {joining === g.id ? "Joining..." : `Join · ${g.stake_amount}c`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
