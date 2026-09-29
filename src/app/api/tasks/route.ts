import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const params = request.nextUrl.searchParams;
  const listId = params.get("list_id");
  const status = params.get("status"); // if omitted, defaults to active (not_started/in_progress)
  const search = params.get("q");
  const tag = params.get("tag");
  // Dashboard day-view filters — mutually exclusive, checked in this order:
  const unassigned = params.get("unassigned"); // "true" -> due_date IS NULL
  const dueOn = params.get("due_on"); // YYYY-MM-DD, exact match (Tomorrow / Custom)
  const dueBeforeOrOn = params.get("due_before_or_on"); // YYYY-MM-DD (Today: includes overdue)

  let query = supabase.from("tasks").select("*, lists:list_id ( name )");

  if (status === "done") {
    query = query.eq("status", "done");
  } else if (status) {
    query = query.eq("status", status);
  } else {
    query = query.in("status", ["not_started", "in_progress"]);
  }

  if (listId) query = query.eq("list_id", listId);
  if (tag) query = query.contains("tags", [tag]);
  if (search) query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%`);

  if (unassigned === "true") {
    query = query.is("due_date", null);
  } else if (dueOn) {
    query = query.eq("due_date", dueOn);
  } else if (dueBeforeOrOn) {
    // "Today" = due today, plus anything overdue — SQL comparisons against a
    // NULL due_date are never true, so this naturally excludes unassigned
    // tasks without needing a separate NOT NULL check.
    query = query.lte("due_date", dueBeforeOrOn);
  }

  // When viewing one specific list, respect its manual drag order. Any
  // broader view (all lists, day-view filters, search) keeps the automatic
  // due-date sort, since a manual per-list position doesn't have a coherent
  // meaning once tasks from different lists are mixed together.
  if (listId) {
    query = query.order("position", { ascending: true });
  } else {
    query = query.order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.title || !body.list_id) {
    return NextResponse.json({ error: "title and list_id are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // New tasks land at the end of that list's manual order.
  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("list_id", body.list_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (last?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: body.title,
      notes: body.notes ?? null,
      due_date: body.due_date ?? null,
      due_time: body.due_time ?? null,
      priority: body.priority ?? null,
      list_id: body.list_id,
      tags: body.tags ?? [],
      source: "manual",
      position: nextPosition,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}
