import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  // Flip any snoozed items whose time has come back up to 'pending' first,
  // so 'pending' stays the single canonical "needs a decision" state.
  await supabase
    .from("triage_items")
    .update({ state: "pending", snoozed_until: null })
    .eq("state", "snoozed")
    .lte("snoozed_until", nowIso);

  const { data, error } = await supabase
    .from("triage_items")
    .select(
      `id, source, sender_email, title, preview, raw_date, suggested_list_id, state, snoozed_until,
       connected_accounts:source_account_id ( nickname ),
       lists:suggested_list_id ( name )`
    )
    .eq("state", "pending")
    .order("raw_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
