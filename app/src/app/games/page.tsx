"use client";

import { useState, useEffect, useRef } from "react";

interface GroupGame {
  id: string;
  city: string;
  status: string;
  court_id: string | null;
  scheduled_time: string | null;
  members: string[];
  court_name?: string;
  court_address?: string;
  member_names?: string[];
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
  const [games, setGames] = useState<GroupGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatGroupId, setChatGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data?.profile_id) { setLoading(false); return; }
        setProfileId(data.profile_id);

        const groupsRes = await fetch(`/api/bookings?profile_id=${data.profile_id}`);
        const groups: GroupGame[] = await groupsRes.json();

        // Enrich with court names and member names
        const allProfiles = await fetch("/api/profiles").then((r) => r.json());
        const profileMap = new Map(allProfiles.map((p: { id: string; name: string }) => [p.id, p.name]));

        const enriched = await Promise.all(groups.map(async (g) => {
          let court_name: string | undefined;
          let court_address: string | undefined;
          if (g.court_id) {
            const courtRes = await fetch(`/api/courts?city=${encodeURIComponent(g.city)}`);
            const courts = await courtRes.json();
            const court = courts.find((c: { id: string }) => c.id === g.court_id);
            if (court) { court_name = court.name; court_address = court.address; }
          }
          return {
            ...g,
            court_name,
            court_address,
            member_names: g.members.map((id: string) => (profileMap.get(id) as string) ?? "Unknown"),
          };
        }));

        setGames(enriched);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  async function leaveGroup(groupId: string) {
    await fetch("/api/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId, group_id: groupId }),
    });
    setGames((prev) => prev.filter((g) => g.id !== groupId));
    if (chatGroupId === groupId) setChatGroupId(null);
  }

  if (loading) return <p className="text-gray-500">Loading your games...</p>;
  if (!profileId) return <p className="text-gray-500">Log in and create a profile to see your games.</p>;

  const upcoming = games.filter((g) => g.status === "booked");
  const forming = games.filter((g) => g.status === "forming");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">My Games</h1>

      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-green-700">Upcoming Games</h2>
          {upcoming.map((g) => (
            <div key={g.id} className="bg-white border-2 border-green-200 rounded-xl p-4 md:p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <h3 className="font-bold text-lg">{g.court_name ?? g.city}</h3>
                  {g.court_address && <p className="text-gray-500 text-sm">{g.court_address}</p>}
                </div>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold self-start">Booked</span>
              </div>
              {g.scheduled_time && (
                <p className="text-lg font-semibold">
                  {new Date(g.scheduled_time).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Players ({g.member_names?.length}/4):</p>
                <div className="flex flex-wrap gap-2">
                  {g.member_names?.map((name, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm font-medium">{name}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => openChat(g.id)} className="text-sm text-green-700 font-medium hover:underline">Open Group Chat</button>
            </div>
          ))}
        </div>
      )}

      {forming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-yellow-700">Groups Forming</h2>
          {forming.map((g) => (
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
              </div>
            </div>
          ))}
        </div>
      )}

      {games.length === 0 && (
        <p className="text-gray-500">No games yet. Go to Matches and join a group to get started!</p>
      )}

      {/* Chat Panel */}
      {chatGroupId && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-green-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="font-semibold text-sm">Group Chat</span>
            <button onClick={() => setChatGroupId(null)} className="text-xs text-gray-500 hover:text-gray-800">Close</button>
          </div>
          <div className="h-64 overflow-y-auto px-4 py-3 space-y-2">
            {messages.length === 0 && <p className="text-gray-400 text-sm">No messages yet. Coordinate with your group!</p>}
            {messages.map((m) => (
              <div key={m.id} className={`text-sm ${m.profile_id === profileId ? "text-right" : ""}`}>
                <span className="text-xs text-gray-400">{m.profile_name}</span>
                <div className={`inline-block px-3 py-1.5 rounded-lg mt-0.5 ${m.profile_id === profileId ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-800"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMsg} className="border-t border-gray-200 px-4 py-2 flex gap-2">
            <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)} placeholder="Type a message..." className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm" maxLength={1000} />
            <button type="submit" className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
