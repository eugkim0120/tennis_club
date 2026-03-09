"use client";

import { useState, useEffect, useRef } from "react";
import ProfileCard from "@/components/ProfileCard";

interface Profile {
  id: string;
  name: string;
  age: number;
  languages: string[];
  skill_level: number;
  city: string | null;
  bio: string;
}

interface ScoredMatch {
  profile: Profile;
  score: number;
  breakdown: { criteria: number; skill: number; behavioral: number };
}

interface GroupInfo {
  id: string;
  city: string;
  status: string;
  members: string[];
  court_id: string | null;
  scheduled_time: string | null;
}

interface Message {
  id: string;
  profile_id: string;
  profile_name: string;
  content: string;
  created_at: string;
}

export default function MatchesPage() {
  const [me, setMe] = useState<{ profile_id: string | null } | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [standouts, setStandouts] = useState<ScoredMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinCity, setJoinCity] = useState("New York");
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [chatGroupId, setChatGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((data) => {
      if (data?.profile_id) {
        setMe(data);
        setSelectedId(data.profile_id);
      }
    });
    fetch("/api/profiles").then((r) => r.json()).then(setProfiles);
  }, []);

  async function loadStandouts() {
    if (!selectedId) return;
    setLoading(true);
    const res = await fetch(`/api/matches?profile_id=${selectedId}`);
    setStandouts(await res.json());
    setLoading(false);
  }

  async function loadGroups() {
    if (!selectedId) return;
    const res = await fetch(`/api/bookings?profile_id=${selectedId}`);
    setGroups(await res.json());
  }

  useEffect(() => {
    if (selectedId) { loadStandouts(); loadGroups(); }
  }, [selectedId]);

  async function handleAction(targetId: string, action: "interested" | "pass") {
    await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: selectedId, target_id: targetId, action }),
    });
    setStandouts((prev) => prev.filter((s) => s.profile.id !== targetId));
  }

  async function handleJoinGroup() {
    if (!selectedId) return;
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: selectedId, city: joinCity }),
    });
    loadGroups();
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
    openChat(chatGroupId); // refresh
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Your Standout Matches</h1>

      {!me?.profile_id && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Playing as:</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md text-gray-900">
            <option value="">-- Select your profile --</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.city}) - Skill {p.skill_level}</option>
            ))}
          </select>
        </div>
      )}

      {/* My Groups */}
      {groups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Your Groups</h2>
          {groups.map((g) => (
            <div key={g.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <span className="font-semibold">{g.city}</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${g.status === "booked" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {g.status === "booked" ? "Court Booked!" : `${g.members.length}/4 forming`}
                </span>
                {g.scheduled_time && (
                  <span className="block sm:inline sm:ml-2 text-sm text-gray-500 mt-1 sm:mt-0">
                    {new Date(g.scheduled_time).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <button onClick={() => openChat(g.id)} className="text-sm text-green-700 font-medium hover:underline self-start sm:self-center">
                Chat ({g.members.length})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat Panel */}
      {chatGroupId && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-green-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="font-semibold text-sm">Group Chat</span>
            <button onClick={() => setChatGroupId(null)} className="text-xs text-gray-500 hover:text-gray-800">Close</button>
          </div>
          <div className="h-64 overflow-y-auto px-4 py-3 space-y-2">
            {messages.length === 0 && <p className="text-gray-400 text-sm">No messages yet. Say hi to your group!</p>}
            {messages.map((m) => (
              <div key={m.id} className={`text-sm ${m.profile_id === selectedId ? "text-right" : ""}`}>
                <span className="text-xs text-gray-400">{m.profile_name}</span>
                <div className={`inline-block px-3 py-1.5 rounded-lg mt-0.5 ${m.profile_id === selectedId ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-800"}`}>
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

      {/* Join Group */}
      {selectedId && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-3">Join a Group (Auto-books at 4 players)</h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={joinCity} onChange={(e) => setJoinCity(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 w-full" placeholder="Any city..." />
            </div>
            <button onClick={handleJoinGroup} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">
              Join Group
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-gray-500">Loading standouts...</p>}

      {!loading && standouts.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Showing {standouts.length} standout matches based on your criteria, skill level, and match patterns.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {standouts.map((s) => (
              <ProfileCard key={s.profile.id} profile={s.profile} score={s.score} breakdown={s.breakdown} showActions onInterested={() => handleAction(s.profile.id, "interested")} onPass={() => handleAction(s.profile.id, "pass")} />
            ))}
          </div>
        </div>
      )}

      {!loading && selectedId && standouts.length === 0 && (
        <p className="text-gray-500">No more standouts to show. Check back later or load demo data from the home page.</p>
      )}
    </div>
  );
}
