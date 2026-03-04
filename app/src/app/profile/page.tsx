"use client";

import { useState, useEffect } from "react";

interface Profile {
  id: string;
  name: string;
  age: number;
  languages: string[];
  skill_level: number;
  city: string | null;
  bio: string;
  preferred_age_min: number;
  preferred_age_max: number;
  preferred_skill_min: number;
  preferred_skill_max: number;
}

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    age: 25,
    languages: "English",
    skill_level: 3.0,
    city: "New York",
    bio: "",
    preferred_age_min: 18,
    preferred_age_max: 50,
    preferred_skill_min: 1.0,
    preferred_skill_max: 5.0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profiles").then((r) => r.json()).then(setProfiles);
  }, []);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.details ? data.details.map((d: { message: string }) => d.message).join(", ") : data.error);
      setSaving(false);
      return;
    }
    setProfiles((prev) => [data, ...prev]);
    setSelectedId(data.id);
    setForm({ name: "", age: 25, languages: "English", skill_level: 3.0, city: "New York", bio: "", preferred_age_min: 18, preferred_age_max: 50, preferred_skill_min: 1.0, preferred_skill_max: 5.0 });
    setSaving(false);
  }

  async function deleteProfile(id: string) {
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId("");
    }
  }

  const selected = profiles.find((p) => p.id === selectedId);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      {profiles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select a profile to use:</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md text-gray-900"
          >
            <option value="">-- Select profile --</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.city}) - Skill {p.skill_level}
              </option>
            ))}
          </select>
        </div>
      )}

      {selected && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold mb-1">{selected.name}</h2>
              <p className="text-gray-500 text-sm mb-3">{selected.age} years old · {selected.city}</p>
            </div>
            <button
              onClick={() => deleteProfile(selected.id)}
              className="text-red-500 text-sm hover:text-red-700 font-medium"
            >
              Delete
            </button>
          </div>
          <p className="text-gray-600 text-sm mb-3">{selected.bio}</p>
          <div className="space-y-1 text-sm text-gray-500">
            <p>Skill Level: {selected.skill_level}</p>
            <p>Languages: {selected.languages.join(", ")}</p>
            <p>Preferred Age: {selected.preferred_age_min}-{selected.preferred_age_max}</p>
            <p>Preferred Skill: {selected.preferred_skill_min}-{selected.preferred_skill_max}</p>
          </div>
          <p className="mt-3 text-xs text-gray-400">ID: {selected.id}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md">
        <h2 className="text-lg font-bold mb-4">Create New Profile</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={createProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              <input type="number" min={13} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: +e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Skill (1-5)</label>
              <input type="number" min={1} max={5} step={0.5} value={form.skill_level} onChange={(e) => setForm({ ...form, skill_level: +e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Languages (comma-separated)</label>
            <input type="text" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Preferred Age Min</label>
              <input type="number" min={13} max={120} value={form.preferred_age_min} onChange={(e) => setForm({ ...form, preferred_age_min: +e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preferred Age Max</label>
              <input type="number" min={13} max={120} value={form.preferred_age_max} onChange={(e) => setForm({ ...form, preferred_age_max: +e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
