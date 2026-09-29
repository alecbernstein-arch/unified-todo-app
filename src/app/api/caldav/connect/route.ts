import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";
import { testICloudCredentials } from "@/lib/caldav";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("id, icloud_username, default_list_id, status, created_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connection: data });
}

export async function POST(request: NextRequest) {
  const { username, appPassword } = await request.json();
  if (!username || !appPassword) {
    return NextResponse.json(
      { error: "username and appPassword are required" },
      { status: 400 }
    );
  }

  try {
    // Fail fast with a clear error if the credentials don't actually work,
    // rather than only finding out on the next cron sync.
    await testICloudCredentials(username, appPassword);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Couldn't log in to iCloud: ${err.message ?? "unknown error"}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const encryptedPassword = encrypt(appPassword);

  const { data: existing } = await supabase
    .from("calendar_connections")
    .select("id")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("calendar_connections")
      .update({
        icloud_username: username,
        icloud_app_password_encrypted: encryptedPassword,
        status: "active",
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("calendar_connections").insert({
      icloud_username: username,
      icloud_app_password_encrypted: encryptedPassword,
      status: "active",
    });
  }

  return NextResponse.json({ ok: true });
}
