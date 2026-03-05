import { NextRequest, NextResponse } from "next/server";
import { register, login, logout } from "@/lib/auth";
import { serialize } from "cookie";

function setSessionCookie(token: string) {
  return serialize("session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
}

function clearSessionCookie() {
  return serialize("session", "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, email, password } = body;

  if (!action || !email || !password) {
    return NextResponse.json({ error: "action, email, and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  try {
    if (action === "register") {
      const user = register(email, password);
      const res = NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
      res.headers.set("Set-Cookie", setSessionCookie(user.session_token!));
      return res;
    }

    if (action === "login") {
      const user = login(email, password);
      const res = NextResponse.json({ id: user.id, email: user.email });
      res.headers.set("Set-Cookie", setSessionCookie(user.session_token!));
      return res;
    }

    if (action === "logout") {
      const sessionCookie = req.cookies.get("session")?.value;
      if (sessionCookie) logout(sessionCookie);
      const res = NextResponse.json({ ok: true });
      res.headers.set("Set-Cookie", clearSessionCookie());
      return res;
    }

    return NextResponse.json({ error: "action must be 'register', 'login', or 'logout'" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
