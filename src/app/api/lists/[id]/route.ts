import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if ("name" in body) {
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "A list name is required" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if ("color" in body) {
    // A real hex string sets a custom color; null explicitly clears it,
    // reverting that list to the rotating-palette fallback.
    if (body.color !== null && !/^#[0-9a-fA-F]{6}$/.test(body.color ?? "")) {
      return NextResponse.json({ error: "color must be a hex string like #C2542D, or null" }, { status: 400 });
    }
    updates.color = body.color;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("lists").update(updates).eq("id", id);
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
