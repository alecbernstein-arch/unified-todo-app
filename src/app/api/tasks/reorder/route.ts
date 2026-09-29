import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Persists a manual task order within a single list — mirrors
 * /api/lists/reorder. The frontend sends the full list of task IDs in their
 * new order (scoped to whatever one list is currently being viewed); each
 * task's `position` becomes its index in that array.
 */
export async function POST(request: NextRequest) {
  const { orderedIds } = await request.json();
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "orderedIds must be an array of task IDs" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const results = await Promise.all(
    orderedIds.map((id: string, index: number) =>
      supabase.from("tasks").update({ position: index }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
