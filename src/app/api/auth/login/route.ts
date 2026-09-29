import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { verifyPasscode } from "@/lib/passcode";

export async function POST(request: NextRequest) {
  const { passcode } = await request.json();
  if (!passcode || typeof passcode !== "string") {
    return NextResponse.json({ error: "Passcode required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("passcode_hash")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "App is not set up yet" }, { status: 500 });
  }

  if (!verifyPasscode(passcode, data.passcode_hash)) {
    return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
