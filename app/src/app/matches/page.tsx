"use client";

import { useState, useEffect } from "react";
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

export default function MatchesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [standouts, setStandouts] = useState<ScoredMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinCity, setJoinCity] = useState("New York");
  const [groupResult, setGroupResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profiles").then((r) => r.json()).then(setProfiles);
  }, []);

  async function loadStandouts() {
    if (!selectedId) return;
    setLoading(true);
    const res = await fetch(`/api/matches?profile_id=${selectedId}`);
    const data = await res.json();
    setStandouts(data);
    setLoading(false);
  }

  useEffect(() => {
    if (selectedId) loadStandouts();
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
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: selectedId, city: joinCity }),
    });
    const data = await res.json();
    if (data.status === "booked") {
      setGroupResult(`Court booked! Group has ${data.members.length} players. Time: ${data.scheduled_time}`);
    } else {
      setGroupResult(`Joined group in ${joinCity}. ${data.members.length}/4 players so far. Auto-books at 4!`);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Your Standout Matches</h1>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Playing as:</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md text-gray-900"
        >
          <option value="">-- Select your profile --</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.city}) - Skill {p.skill_level}
            </option>
          ))}
        </select>
      </div>

      {selectedId && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-3">Join a Group (Auto-books at 4 players)</h2>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select value={joinCity} onChange={(e) => setJoinCity(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                <option>New York</option>
                <option>San Francisco</option>
                <option>Los Angeles</option>
                <option>London</option>
              </select>
            </div>
            <button onClick={handleJoinGroup} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">
              Join Group
            </button>
          </div>
          {groupResult && <p className="mt-3 text-sm text-green-700 font-medium">{groupResult}</p>}
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
              <ProfileCard
                key={s.profile.id}
                profile={s.profile}
                score={s.score}
                breakdown={s.breakdown}
                showActions
                onInterested={() => handleAction(s.profile.id, "interested")}
                onPass={() => handleAction(s.profile.id, "pass")}
              />
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
