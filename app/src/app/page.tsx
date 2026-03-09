"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) { setLoggedIn(true); router.push("/matches"); }
        else setLoggedIn(false);
      })
      .catch(() => setLoggedIn(false));
  }, [router]);

  if (loggedIn === null) return null; // loading
  if (loggedIn) return null; // redirecting

  return (
    <div className="space-y-8">
      <div className="text-center py-16">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">TennisMatch</h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Find tennis partners near you. Get matched by skill level. We auto-book a court when your group hits 4.
        </p>
        <Link href="/login" className="bg-green-600 text-white px-6 md:px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-700 transition-colors inline-block">
          Get Started
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <div className="text-3xl mb-3">1</div>
          <h2 className="text-lg font-bold mb-2">Create Your Profile</h2>
          <p className="text-gray-600 text-sm">
            Set your skill level, preferred age range, and languages. Our algorithm finds your best matches.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <div className="text-3xl mb-3">2</div>
          <h2 className="text-lg font-bold mb-2">Match & Join Groups</h2>
          <p className="text-gray-600 text-sm">
            Browse standout matches. Express interest. Join a city group and chat with your future opponents.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <div className="text-3xl mb-3">3</div>
          <h2 className="text-lg font-bold mb-2">Auto-Book & Play</h2>
          <p className="text-gray-600 text-sm">
            When 4 players join, we auto-book a real court nearby. Show up and play.
          </p>
        </div>
      </div>
    </div>
  );
}
