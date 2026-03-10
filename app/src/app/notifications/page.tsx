"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  reference_id: string | null;
  read: number;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => { if (!r.ok) router.push("/login"); });
    loadNotifications();
  }, [router]);

  async function loadNotifications() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
    }
    setLoading(false);
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" });
    setNotifications(ns => ns.map(n => ({ ...n, read: 1 })));
  }

  const typeIcon: Record<string, string> = {
    member_joined: "👋",
    member_cancelled: "🚪",
    game_booked: "✅",
    game_settled: "🏆",
    application_received: "📩",
    application_approved: "🎉",
    credits_received: "💰",
  };

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllRead} className="text-xs text-emerald-600 font-semibold hover:text-emerald-700">
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-4xl mb-3">🔔</div>
          <p className="text-slate-500 font-medium">No notifications yet</p>
          <p className="text-sm text-slate-400">You&apos;ll see updates about your games here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`rounded-2xl p-4 border transition-all ${n.read ? "bg-white border-slate-200/60" : "bg-emerald-50/50 border-emerald-200/60"}`}>
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{typeIcon[n.type] || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{n.title}</span>
                    {!n.read && <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>
                  <span className="text-[11px] text-slate-400 mt-1 block">{timeAgo(n.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
