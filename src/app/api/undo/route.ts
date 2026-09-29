import { NextResponse } from "next/server";
import { getUndoState, performUndo } from "@/lib/undo";

/** Lets the frontend check whether there's anything to undo right now (e.g. on page load). */
export async function GET() {
  const state = await getUndoState();
  return NextResponse.json({ actionType: state?.action_type ?? null });
}

export async function POST() {
  const result = await performUndo();
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
