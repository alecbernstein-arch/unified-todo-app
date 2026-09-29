import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Paths that must stay reachable without a session.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// The cron job authenticates with CRON_SECRET instead of a session cookie.
const CRON_PATH = "/api/cron/sync";

// Google redirects the browser here mid-OAuth-handshake; the user is always
// already logged in when they click "Connect a Gmail account" to start that
// flow, so this doesn't weaken the passcode gate.
const OAUTH_CALLBACK_PATH = "/api/google/callback";

// Named `proxy` (not `middleware`) per the Next.js 16 convention — this file
// replaces what used to be middleware.ts. It now runs on the Node.js
// runtime rather than Edge (Next.js 16 made this the only option for this
// file), which is why passcode.ts's use of Node's `crypto` module would be
// safe to import here too now — though the split from session.ts is kept
// as-is since it's still good separation and does no harm.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname === CRON_PATH ||
    pathname === OAUTH_CALLBACK_PATH ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = token ? await verifySessionToken(token) : false;

  if (!valid) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
