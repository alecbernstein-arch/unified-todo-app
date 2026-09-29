import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("lookback_days, user_name")
    .eq("id", 1)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if ("lookback_days" in body) {
    if (typeof body.lookback_days !== "number" || body.lookback_days < 1 || body.lookback_days > 90) {
      return NextResponse.json(
        { error: "lookback_days must be a number between 1 and 90" },
        { status: 400 }
      );
    }
    updates.lookback_days = body.lookback_days;
  }

  if ("user_name" in body) {
    if (typeof body.user_name !== "string") {
      return NextResponse.json({ error: "user_name must be text" }, { status: 400 });
    }
    updates.user_name = body.user_name.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("app_settings").update(updates).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
