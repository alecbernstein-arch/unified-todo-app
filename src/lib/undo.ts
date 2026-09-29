import { getSupabaseAdmin } from "./supabase";

export type UndoActionType = "accept" | "reject" | "snooze" | "ignore" | "complete";

/**
 * Records the most recent undoable action, overwriting whatever was there
 * before — only the single last action can ever be undone (see PRD Section 4,
 * "Undo").
 */
export async function recordUndo(actionType: UndoActionType, payload: unknown) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("undo_state")
    .update({
      action_type: actionType,
      payload,
      created_at: new Date().toISOString(),
    })
    .eq("id", 1);
}

export async function clearUndo() {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("undo_state")
    .update({ action_type: null, payload: null, created_at: null })
    .eq("id", 1);
}

export async function getUndoState() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("undo_state").select("*").eq("id", 1).single();
  return data as {
    action_type: UndoActionType | null;
    payload: any;
    created_at: string | null;
  } | null;
}

/**
 * Reverses whatever the last recorded action was. Each case restores exactly
 * the rows recordUndo() was given when that action happened.
 */
export async function performUndo(): Promise<{ ok: boolean; message?: string }> {
  const supabase = getSupabaseAdmin();
  const state = await getUndoState();
  if (!state?.action_type) {
    return { ok: false, message: "Nothing to undo" };
  }

  const { action_type, payload } = state;

  switch (action_type) {
    case "accept": {
      // payload: { taskId, triageItemId }
      await supabase.from("tasks").delete().eq("id", payload.taskId);
      await supabase
        .from("triage_items")
        .update({ state: "pending" })
        .eq("id", payload.triageItemId);
      break;
    }
    case "reject":
    case "snooze": {
      // payload: { triageItemId }
      await supabase
        .from("triage_items")
        .update({ state: "pending", snoozed_until: null })
        .eq("id", payload.triageItemId);
      break;
    }
    case "ignore": {
      // payload: { senderEmail, primaryTriageItemId, deletedOtherItems: full rows[] }
      await supabase.from("ignored_senders").delete().eq("email_address", payload.senderEmail);
      await supabase
        .from("triage_items")
        .update({ state: "pending" })
        .eq("id", payload.primaryTriageItemId);
      if (payload.deletedOtherItems?.length) {
        await supabase.from("triage_items").insert(payload.deletedOtherItems);
      }
      break;
    }
    case "complete": {
      // payload: { taskId, previousStatus }
      await supabase
        .from("tasks")
        .update({ status: payload.previousStatus, completed_at: null })
        .eq("id", payload.taskId);
      break;
    }
  }

  await clearUndo();
  return { ok: true };
}
