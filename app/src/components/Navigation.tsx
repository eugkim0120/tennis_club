"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AuthState {
  user: { id: string; email: string } | null;
  profile_id: string | null;
}

export default function Navigation() {
  const pathname = usePathname();
<<<<<<< Updated upstream
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; profile_id: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
=======
  const [auth, setAuth] = useState<AuthState>({ user: null, profile_id: null });
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
>>>>>>> Stashed changes

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) {
        setAuth(d);
        fetch("/api/wallet").then((r) => r.ok ? r.json() : null).then((w) => {
          if (w) setWalletBalance(w.wallet.balance);
        });
        fetch("/api/notifications").then((r) => r.ok ? r.json() : null).then((n) => {
          if (n) setUnreadCount(n.unread_count);
        });
      }
    }).catch(() => {});
  }, [pathname]);

<<<<<<< Updated upstream
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
=======
  const logout = async () => {
>>>>>>> Stashed changes
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.href = "/";
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/games", label: "My Games" },
    { href: "/browse", label: "Browse Games" },
    { href: "/matches", label: "Find Players" },
    { href: "/courts", label: "Courts" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
<<<<<<< Updated upstream
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-green-700">
          TennisMatch
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
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
=======
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg text-slate-900 hidden sm:block tracking-tight">TennisMatch</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive(link.href)
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {auth.user ? (
              <>
                {/* Wallet */}
                {walletBalance !== null && (
                  <Link href="/profile" className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold hover:bg-amber-100 transition-colors border border-amber-200/50">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="2"/><path strokeLinecap="round" strokeWidth="2" d="M12 8v8m0-8c1.1 0 2.08.4 2.6 1M12 16c-1.1 0-2.08-.4-2.6-1"/></svg>
                    {walletBalance}
                  </Link>
                )}

                {/* Notifications */}
                <button
                  onClick={() => window.location.href = "/notifications"}
                  className="relative p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </button>

                {/* Profile link */}
                <Link href="/profile" className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold">{auth.user.email[0].toUpperCase()}</div>
                </Link>

                <button onClick={logout} className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors ml-1">
>>>>>>> Stashed changes
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                Sign In
              </Link>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

<<<<<<< Updated upstream
      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-2 space-y-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  pathname === href
                    ? "bg-green-100 text-green-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-200">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-500">{user.email}</span>
                  <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">
                    Logout
                  </button>
                </div>
              ) : (
                <Link href="/login" className="block px-3 py-2.5 text-base font-medium text-green-700 hover:text-green-900">
                  Login
                </Link>
              )}
            </div>
          </div>
=======
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-3 pt-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${isActive(link.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"}`}
            >{link.label}</Link>
          ))}
>>>>>>> Stashed changes
        </div>
      )}
    </nav>
  );
}
