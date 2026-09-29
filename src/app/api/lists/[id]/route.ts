import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A list name is required" }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("lists").update({ name: name.trim() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * Every list is deletable now — there's no protected "Inbox" list anymore.
 * The only rule: you can't delete your very last remaining list, since
 * every task needs somewhere to live. When a list with tasks in it is
 * deleted, those tasks (and any account/calendar routing rules pointing at
 * it) move to whichever list is currently first in your Dashboard order.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: allLists } = await supabase
    .from("lists")
    .select("id")
    .order("position", { ascending: true });

  if (!allLists || allLists.length <= 1) {
    return NextResponse.json(
      { error: "You need at least one list — create another before deleting this one." },
      { status: 400 }
    );
  }

  const fallback = allLists.find((l) => l.id !== id);
  if (!fallback) {
    return NextResponse.json({ error: "Couldn't find another list to move tasks into." }, { status: 500 });
  }

  await supabase.from("tasks").update({ list_id: fallback.id }).eq("list_id", id);
  await supabase.from("connected_accounts").update({ default_list_id: fallback.id }).eq("default_list_id", id);
  await supabase.from("calendar_connections").update({ default_list_id: fallback.id }).eq("default_list_id", id);
  await supabase.from("triage_items").update({ suggested_list_id: fallback.id }).eq("suggested_list_id", id);

  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
