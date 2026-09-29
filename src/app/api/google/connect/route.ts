import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getGoogleAuthUrl } from "@/lib/google";

/**
 * GET /api/google/connect — redirects the browser into Google's consent
 * screen. The "Connect a Gmail account" button just links here directly.
 */
export async function GET(request: NextRequest) {
  const state = crypto.randomBytes(16).toString("hex");
  const url = getGoogleAuthUrl(state);
  const response = NextResponse.redirect(url);
  // Short-lived cookie so the callback can confirm this request round-tripped
  // through the same browser session (basic CSRF protection for the OAuth flow).
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return response;
}
