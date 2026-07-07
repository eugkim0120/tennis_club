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
        if (r.ok) { setLoggedIn(true); router.push("/games"); }
        else setLoggedIn(false);
      })
      .catch(() => setLoggedIn(false));
  }, [router]);

  if (loggedIn === null || loggedIn) return null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center -mt-6">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto px-4 py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-6 border border-emerald-200/50">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Now with stake-backed commitment
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">
          Find players.<br />Book courts.<br />
          <span className="text-emerald-600">Show up.</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
          Match with players by skill level, form groups across multiple sports, stake credits to lock in commitment, and auto-book real courts. No more no-shows.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login" className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-base font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30">
            Get Started Free
          </Link>
          <Link href="/browse" className="px-8 py-3 bg-white text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-50 transition-all border border-slate-200">
            Browse Games
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto w-full px-4">
        {[
          {
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
            title: "Smart Matching",
            desc: "Our algorithm scores players on skill compatibility, age preferences, and behavioral patterns. Find your perfect partner across tennis, padel, and more.",
          },
          {
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="1.5"/><path strokeLinecap="round" strokeWidth="1.5" d="M12 8v8m0-8c1.1 0 2.08.4 2.6 1M12 16c-1.1 0-2.08-.4-2.6-1"/></svg>,
            title: "Stake to Commit",
            desc: "Put credits on the line when you join. Show up and get them back. No-shows forfeit their stake to attendees.",
          },
          {
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
            title: "Real Courts",
            desc: "We discover real courts via OpenStreetMap and auto-book when your group fills up. Just show up and play.",
          },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-200/60 hover:border-emerald-200 transition-all hover:shadow-md group">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-100 transition-colors">
              {f.icon}
            </div>
            <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Trust indicator */}
      <div className="mt-12 text-center text-sm text-slate-400">
        100 free credits on signup &middot; No credit card required
      </div>
    </div>
  );
}
