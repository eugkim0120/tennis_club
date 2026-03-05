"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/matches", label: "Matches" },
  { href: "/courts", label: "Courts" },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; profile_id: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUser({ email: data.user.email, profile_id: data.profile_id });
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", email: "", password: "" }),
    });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-green-700">
          TennisMatch
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-green-100 text-green-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="ml-3 pl-3 border-l border-gray-200">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{user.email}</span>
                <button onClick={handleLogout} className="text-xs text-red-600 hover:text-red-800 font-medium">
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-medium text-green-700 hover:text-green-900">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
