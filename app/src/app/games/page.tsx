"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface GroupMember {
  profile_id: string;
  name: string;
  skill_level: number;
  reliability_score: number;
  stake_amount: number;
  status: string;
}

interface GameGroup {
  id: string;
  creator_id: string | null;
  title: string | null;
  city: string;
  status: string;
  court_id: string | null;
  scheduled_time: string | null;
  stake_amount: number;
  max_members: number;
  members: GroupMember[];
  court_name?: string;
  court_address?: string;
}

interface Message {
  id: string;
  profile_id: string;
  profile_name: string;
  content: string;
  created_at: string;
}

export default function GamesPage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [games, setGames] = useState<GameGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatGroupId, setChatGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data?.profile_id) { setLoading(false); return; }
        setProfileId(data.profile_id);
        await loadGames(data.profile_id);
      })
      .catch(() => setLoading(false));
  }, []);

  async function loadGames(pid: string) {
    const res = await fetch(`/api/bookings?profile_id=${pid}`);
    const groups: GameGroup[] = await res.json();

    // Enrich with court names
    const enriched = await Promise.all(groups.map(async (g) => {
      if (g.court_id) {
        try {
          const courtRes = await fetch(`/api/courts?city=${encodeURIComponent(g.city)}`);
          const courts = await courtRes.json();
          const court = courts.find((c: { id: string }) => c.id === g.court_id);
          if (court) return { ...g, court_name: court.name, court_address: court.address };
        } catch { /* ignore */ }
      }
      return g;
    }));

    setGames(enriched);
    setLoading(false);
  }

  async function openChat(groupId: string) {
    setChatGroupId(groupId);
    const res = await fetch(`/api/messages?group_id=${groupId}`);
    setMessages(await res.json());
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function sendMsg(e: React.FormEvent) {
    e.preventDefault();
    if (!msgInput.trim() || !chatGroupId) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: chatGroupId, content: msgInput }),
    });
    setMsgInput("");
    openChat(chatGroupId);
  }

  async function handleCancel(groupId: string) {
    setActionLoading(groupId);
    const res = await fetch(`/api/groups/${groupId}/cancel`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      alert(`Cancelled. Refund: ${data.refund} credits (${data.tier})`);
      if (profileId) await loadGames(profileId);
    } else {
      const data = await res.json();
      alert(data.error);
    }
    setActionLoading(null);
  }

  async function handleCheckIn(groupId: string) {
    setActionLoading(groupId);
    const res = await fetch(`/api/groups/${groupId}/checkin`, { method: "POST" });
    if (res.ok) alert("Checked in! Your stake will be refunded after the game.");
    else { const data = await res.json(); alert(data.error); }
    setActionLoading(null);
  }

  async function handleSettle(groupId: string) {
    setActionLoading(groupId);
    const res = await fetch(`/api/groups/${groupId}/settle`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      alert(`Game settled! ${data.attended.length} attended, ${data.noShows.length} no-show(s).`);
      if (profileId) await loadGames(profileId);
    } else {
      const data = await res.json();
      alert(data.error);
    }
    setActionLoading(null);
  }

  if (loading) return <div className="text-center py-16 text-slate-400">Loading your games...</div>;

  if (!profileId) return (
    <div className="text-center py-16">
      <div className="text-slate-300 text-5xl mb-4">🎾</div>
      <p className="text-slate-500 font-medium">Sign in and create a profile to see your games</p>
      <Link href="/login" className="inline-block mt-4 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Sign In</Link>
    </div>
  );

  const booked = games.filter((g) => g.status === "booked");
  const forming = games.filter((g) => g.status === "forming");
  const completed = games.filter((g) => g.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Games</h1>
          <p className="text-sm text-slate-500 mt-0.5">{games.length} game{games.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/create-game" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm">
          + Create Game
        </Link>
      </div>

<<<<<<< Updated upstream
      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-green-700">Upcoming Games</h2>
          {upcoming.map((g) => (
            <div key={g.id} className="bg-white border-2 border-green-200 rounded-xl p-4 md:p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
=======
      {/* Booked Games */}
      {booked.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Upcoming</h2>
          {booked.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border-2 border-emerald-200/60 p-5 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
>>>>>>> Stashed changes
                <div>
                  <h3 className="font-semibold text-slate-900">{g.title || g.court_name || g.city}</h3>
                  {g.court_address && <p className="text-xs text-slate-400 mt-0.5">{g.court_address}</p>}
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold">Booked</span>
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[11px] font-semibold border border-amber-200/50">{g.stake_amount}c staked</span>
                </div>
<<<<<<< Updated upstream
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold self-start">Booked</span>
=======
>>>>>>> Stashed changes
              </div>

              {g.scheduled_time && (
                <p className="text-base font-semibold text-slate-800">
                  {new Date(g.scheduled_time).toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              )}
<<<<<<< Updated upstream
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Players ({g.member_names?.length}/4):</p>
                <div className="flex flex-wrap gap-2">
                  {g.member_names?.map((name, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm font-medium">{name}</span>
                  ))}
                </div>
=======

              <div className="flex -space-x-2">
                {g.members.map((m, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-700" title={m.name}>
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                ))}
                <span className="ml-3 text-xs text-slate-400 self-center">{g.members.length}/{g.max_members} players</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => handleCheckIn(g.id)} disabled={actionLoading === g.id}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm">
                  Check In
                </button>
                <button onClick={() => openChat(g.id)} className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors">
                  Chat
                </button>
                {g.creator_id === profileId && (
                  <button onClick={() => handleSettle(g.id)} disabled={actionLoading === g.id}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm">
                    Settle Game
                  </button>
                )}
                <button onClick={() => handleCancel(g.id)} disabled={actionLoading === g.id}
                  className="px-4 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors ml-auto">
                  Cancel
                </button>
>>>>>>> Stashed changes
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forming Groups */}
      {forming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Forming</h2>
          {forming.map((g) => (
<<<<<<< Updated upstream
            <div key={g.id} className="bg-white border border-yellow-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <span className="font-semibold">{g.city}</span>
                <span className="ml-2 text-sm text-yellow-700">{g.member_names?.length}/4 players</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {g.member_names?.map((name, i) => (
                    <span key={i} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{name}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 self-start sm:self-center">
                <button onClick={() => openChat(g.id)} className="text-sm text-green-700 font-medium hover:underline">Chat</button>
                <button onClick={() => leaveGroup(g.id)} className="text-sm text-red-500 font-medium hover:underline">Leave</button>
=======
            <div key={g.id} className="bg-white rounded-2xl border border-amber-200/60 p-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900">{g.title || g.city}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">{g.members.length}/{g.max_members} players</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[11px] font-semibold border border-amber-200/50">{g.stake_amount}c staked</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {g.members.map((m, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{m.name}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openChat(g.id)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors">Chat</button>
                  <button onClick={() => handleCancel(g.id)} disabled={actionLoading === g.id}
                    className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Completed</h2>
          {completed.map((g) => (
            <div key={g.id} className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 opacity-70">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm text-slate-600">{g.title || g.city}</span>
                <span className="text-xs text-slate-400">Completed</span>
>>>>>>> Stashed changes
              </div>
            </div>
          ))}
        </div>
      )}

      {games.length === 0 && (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">🎾</div>
          <p className="text-slate-500 font-medium">No games yet</p>
          <p className="text-sm text-slate-400 mt-1">Create a game or browse open ones to get started</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/create-game" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Create Game</Link>
            <Link href="/browse" className="px-5 py-2 bg-white text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 border border-slate-200">Browse Games</Link>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {chatGroupId && (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50">
          <div className="bg-emerald-600 px-4 py-3 flex justify-between items-center">
            <span className="font-semibold text-sm text-white">Group Chat</span>
            <button onClick={() => setChatGroupId(null)} className="text-emerald-200 hover:text-white text-sm font-medium">Close</button>
          </div>
          <div className="h-72 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50/50">
            {messages.length === 0 && <p className="text-slate-400 text-sm text-center mt-8">No messages yet</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.profile_id === profileId ? "items-end" : "items-start"}`}>
                <span className="text-[10px] text-slate-400 mb-0.5">{m.profile_name}</span>
                <div className={`inline-block px-3 py-1.5 rounded-2xl text-sm max-w-[80%] ${m.profile_id === profileId ? "bg-emerald-600 text-white" : "bg-white text-slate-800 border border-slate-200"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMsg} className="border-t border-slate-200 px-3 py-2 flex gap-2 bg-white">
            <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)} placeholder="Type a message..." className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" maxLength={1000} />
            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
