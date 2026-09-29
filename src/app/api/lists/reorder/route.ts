import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Persists a new Dashboard tile order. The frontend sends the full list of
 * IDs in their new order; each list's `position` becomes its index in that
 * array. This also determines list order everywhere else in the app (the
 * list switcher, Manage Lists, every "which list" dropdown), since they all
 * read the same /api/lists response.
 */
export async function POST(request: NextRequest) {
  const { orderedIds } = await request.json();
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "orderedIds must be an array of list IDs" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  // One UPDATE per list — supabase-js has no single call for "update many
  // rows to different values," but this is at most a handful of lists for a
  // personal app, so the extra round trips are unnoticeable.
  const results = await Promise.all(
    orderedIds.map((id: string, index: number) =>
      supabase.from("lists").update({ position: index }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
