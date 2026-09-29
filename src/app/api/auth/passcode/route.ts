import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPasscode, verifyPasscode } from "@/lib/passcode";

/** Lets the end user change the shared passcode from Settings, once logged in. */
export async function POST(request: NextRequest) {
  const { currentPasscode, newPasscode } = await request.json();
  if (!currentPasscode || !newPasscode) {
    return NextResponse.json(
      { error: "currentPasscode and newPasscode are required" },
      { status: 400 }
    );
  }
  if (newPasscode.length < 4) {
    return NextResponse.json(
      { error: "New passcode must be at least 4 characters" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("passcode_hash")
    .eq("id", 1)
    .single();

  if (error || !data || !verifyPasscode(currentPasscode, data.passcode_hash)) {
    return NextResponse.json({ error: "Current passcode is incorrect" }, { status: 401 });
  }

  const newHash = hashPasscode(newPasscode);
  await supabase
    .from("app_settings")
    .update({ passcode_hash: newHash, updated_at: new Date().toISOString() })
    .eq("id", 1);

  return NextResponse.json({ ok: true });
}
