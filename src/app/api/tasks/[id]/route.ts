import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { recordUndo } from "@/lib/undo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const body = await request.json();

  // Explicit "uncheck from the Completed tab" — reverts to Not Started directly,
  // and deliberately does NOT go through the global Undo (see PRD).
  if (body.uncomplete === true) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "not_started", completed_at: null })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Checking the box: status -> 'done'. This IS one of the five actions the
  // global Undo affordance covers.
  if (body.status === "done") {
    const { data: current } = await supabase
      .from("tasks")
      .select("status")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await recordUndo("complete", {
      taskId: id,
      previousStatus: current?.status ?? "not_started",
    });
    return NextResponse.json({ ok: true });
  }

  // Everything else (title, notes, due_date, priority, list_id, tags, or
  // toggling Not Started <-> In Progress) is a plain update, no undo tracking.
  const updatable = ["title", "notes", "due_date", "due_time", "priority", "list_id", "tags", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of updatable) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabase.from("tasks").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
