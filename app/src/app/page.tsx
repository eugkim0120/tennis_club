"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function seedData() {
    setLoading(true);
    try {
      const profiles = [
        { name: "Alex Chen", age: 28, languages: ["English", "Mandarin"], skill_level: 3.5, city: "New York", bio: "Love doubles! Available weekends.", preferred_age_min: 22, preferred_age_max: 40, preferred_skill_min: 2.5, preferred_skill_max: 4.5 },
        { name: "Maria Garcia", age: 32, languages: ["English", "Spanish"], skill_level: 4.0, city: "New York", bio: "Competitive player looking for practice partners.", preferred_age_min: 25, preferred_age_max: 45, preferred_skill_min: 3.0, preferred_skill_max: 5.0 },
        { name: "James Wilson", age: 25, languages: ["English"], skill_level: 2.5, city: "New York", bio: "Getting back into tennis after college.", preferred_age_min: 20, preferred_age_max: 35, preferred_skill_min: 1.5, preferred_skill_max: 3.5 },
        { name: "Yuki Tanaka", age: 30, languages: ["English", "Japanese"], skill_level: 3.8, city: "New York", bio: "Weekend warrior, love clay courts.", preferred_age_min: 24, preferred_age_max: 40, preferred_skill_min: 3.0, preferred_skill_max: 4.5 },
        { name: "Sophie Martin", age: 27, languages: ["English", "French"], skill_level: 3.2, city: "New York", bio: "Looking for a regular hitting partner.", preferred_age_min: 22, preferred_age_max: 38, preferred_skill_min: 2.5, preferred_skill_max: 4.0 },
        { name: "David Park", age: 35, languages: ["English", "Korean"], skill_level: 4.2, city: "New York", bio: "Former college player, coaching on the side.", preferred_age_min: 20, preferred_age_max: 50, preferred_skill_min: 3.0, preferred_skill_max: 5.0 },
        { name: "Emma Thompson", age: 24, languages: ["English"], skill_level: 2.0, city: "San Francisco", bio: "Just started playing! Very enthusiastic.", preferred_age_min: 20, preferred_age_max: 35, preferred_skill_min: 1.0, preferred_skill_max: 3.0 },
        { name: "Carlos Rivera", age: 29, languages: ["English", "Spanish"], skill_level: 3.6, city: "San Francisco", bio: "Tennis and tacos are my two passions.", preferred_age_min: 23, preferred_age_max: 40, preferred_skill_min: 2.5, preferred_skill_max: 4.5 },
      ];

      for (const p of profiles) {
        await fetch("/api/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      }

      for (const city of ["New York", "San Francisco"]) {
        await fetch("/api/courts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city }) });
      }

      setSeeded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">TennisMatch</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Find your perfect tennis partner. We match you based on skill level, preferences, and playing style — then auto-book a court when your group is ready.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <div className="text-3xl mb-3">🎾</div>
          <h2 className="text-lg font-bold mb-2">Smart Matching</h2>
          <p className="text-gray-600 text-sm">
            Hinge-style standouts match you with players who fit your criteria, skill level, and playing patterns.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <div className="text-3xl mb-3">📍</div>
          <h2 className="text-lg font-bold mb-2">Court Discovery</h2>
          <p className="text-gray-600 text-sm">
            We scrape local tennis courts and show real-time availability so you always find a place to play.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <div className="text-3xl mb-3">📅</div>
          <h2 className="text-lg font-bold mb-2">Auto-Booking</h2>
          <p className="text-gray-600 text-sm">
            Once 4 players are interested in the same area, we automatically book a court for you.
          </p>
        </div>
      </div>

      <div className="text-center space-y-4">
        {!seeded && (
          <button
            onClick={seedData}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Setting up demo..." : "Load Demo Data"}
          </button>
        )}
        {seeded && (
          <p className="text-green-600 font-medium">Demo data loaded! Explore the app using the navigation above.</p>
        )}
        <div className="flex justify-center gap-4">
          <Link href="/profile" className="text-green-700 font-medium hover:underline">
            Create Profile →
          </Link>
          <Link href="/matches" className="text-green-700 font-medium hover:underline">
            View Matches →
          </Link>
          <Link href="/courts" className="text-green-700 font-medium hover:underline">
            Browse Courts →
          </Link>
        </div>
      </div>
    </div>
  );
}
