import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { recordUndo } from "@/lib/undo";

async function getFallbackListId(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await supabase
    .from("lists")
    .select("id")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id as string | undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const body = await request.json();
  const action: "accept" | "reject" | "snooze" | "ignore" = body.action;

  const { data: item, error: itemError } = await supabase
    .from("triage_items")
    .select("*")
    .eq("id", id)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Triage item not found" }, { status: 404 });
  }

  switch (action) {
    case "accept": {
      const listId = body.listId || item.suggested_list_id || (await getFallbackListId(supabase));
      if (!listId) {
        return NextResponse.json(
          { error: "Create a list first — there's nowhere to put this yet." },
          { status: 400 }
        );
      }

      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: item.title,
          list_id: listId,
          source: item.source,
          source_ref: item.source_ref,
          source_account_id: item.source_account_id,
          triage_item_id: item.id,
        })
        .select()
        .single();

      if (taskError || !task) {
        return NextResponse.json({ error: taskError?.message ?? "Failed to create task" }, { status: 500 });
      }

      await supabase.from("triage_items").update({ state: "accepted" }).eq("id", item.id);
      await recordUndo("accept", { taskId: task.id, triageItemId: item.id });
      return NextResponse.json({ ok: true, task });
    }

    case "reject": {
      await supabase.from("triage_items").update({ state: "rejected" }).eq("id", item.id);
      await recordUndo("reject", { triageItemId: item.id });
      return NextResponse.json({ ok: true });
    }

    case "snooze": {
      const snoozedUntil: string | undefined = body.snoozeUntil;
      if (!snoozedUntil) {
        return NextResponse.json({ error: "snoozeUntil is required" }, { status: 400 });
      }
      await supabase
        .from("triage_items")
        .update({ state: "snoozed", snoozed_until: snoozedUntil })
        .eq("id", item.id);
      await recordUndo("snooze", { triageItemId: item.id });
      return NextResponse.json({ ok: true });
    }

    case "ignore": {
      // Calendar items have no sender concept — Ignore behaves like Reject (see PRD).
      if (item.source === "calendar") {
        await supabase.from("triage_items").update({ state: "rejected" }).eq("id", item.id);
        await recordUndo("reject", { triageItemId: item.id });
        return NextResponse.json({ ok: true });
      }

      const senderEmail: string = item.sender_email;
      if (!senderEmail) {
        return NextResponse.json({ error: "This item has no sender to ignore" }, { status: 400 });
      }

      // Grab every other pending item from this sender before deleting them,
      // so Undo can restore them exactly.
      const { data: others } = await supabase
        .from("triage_items")
        .select("*")
        .eq("sender_email", senderEmail)
        .eq("state", "pending")
        .neq("id", item.id);

      if (others?.length) {
        await supabase
          .from("triage_items")
          .delete()
          .in("id", others.map((o) => o.id));
      }

      await supabase.from("ignored_senders").upsert(
        { email_address: senderEmail },
        { onConflict: "email_address", ignoreDuplicates: true }
      );
      await supabase.from("triage_items").update({ state: "rejected" }).eq("id", item.id);

      await recordUndo("ignore", {
        senderEmail,
        primaryTriageItemId: item.id,
        deletedOtherItems: others ?? [],
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
