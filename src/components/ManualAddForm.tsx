"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import { List } from "@/lib/types";

/**
 * Collapsed, this is just a button. Clicking it opens the full task-creation
 * form right there — title, notes, date, time, priority, tags, and list —
 * so a task can be fully detailed at the moment it's created instead of
 * needing a separate edit pass afterward.
 */
export function ManualAddForm({
  lists,
  defaultListId,
  color,
  onAdded,
}: {
  lists: List[];
  defaultListId: string | null;
  color: string; // matches the currently viewed list's color (or the neutral fallback for "All lists")
  onAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [listId, setListId] = useState(defaultListId ?? lists[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [hasDate, setHasDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [hasTime, setHasTime] = useState(false);
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<"" | "low" | "medium" | "high">("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  // Same useState's-initial-value-only-runs-once gap as before — keeps the
  // list selector following whichever list you're currently viewing.
  useEffect(() => {
    setListId(defaultListId ?? lists[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultListId]);

  // Same ghost-click guard as the task edit panel's date/time toggles.
  const suppressNextAddRef = useRef(false);
  function suppressNextAddBriefly() {
    suppressNextAddRef.current = true;
    setTimeout(() => {
      suppressNextAddRef.current = false;
    }, 400);
  }

  function resetForm() {
    setTitle("");
    setNotes("");
    setHasDate(false);
    setDueDate("");
    setHasTime(false);
    setDueTime("");
    setPriority("");
    setTags("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !listId) return;
    setBusy(true);
    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          list_id: listId,
          notes: notes.trim() || null,
          due_date: hasDate ? dueDate : null,
          due_time: hasDate && hasTime ? dueTime : null,
          priority: priority || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      resetForm();
      setExpanded(false);
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{ backgroundColor: color }}
        className="flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add a task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-md border border-line bg-surface p-4">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title…"
        className="w-full rounded-sm border border-line px-3 py-2 text-sm outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={2}
        className="w-full rounded-sm border border-line px-2 py-1.5 text-sm"
      />

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-ink/60">
          Date
          {hasDate ? (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => {
                  setHasDate(false);
                  setDueDate("");
                  suppressNextAddBriefly();
                }}
                className="px-1 text-ink/50"
                aria-label="Remove date"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (suppressNextAddRef.current) return;
                setHasDate(true);
                setDueDate(format(new Date(), "yyyy-MM-dd"));
              }}
              className="rounded-sm border border-dashed border-line px-2 py-1.5 text-sm text-ink/60 hover:border-amber hover:text-amber"
            >
              + Add a date
            </button>
          )}
        </label>

        {hasDate && (
          <label className="flex flex-col gap-0.5 text-[11px] font-medium text-ink/60">
            Time
            {hasTime ? (
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="rounded-sm border border-line px-2 py-1.5 text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={() => {
                    setHasTime(false);
                    setDueTime("");
                    suppressNextAddBriefly();
                  }}
                  className="px-1 text-ink/50"
                  aria-label="Remove time"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (suppressNextAddRef.current) return;
                  setHasTime(true);
                  setDueTime("09:00");
                }}
                className="rounded-sm border border-dashed border-line px-2 py-1.5 text-sm text-ink/60 hover:border-amber hover:text-amber"
              >
                + Add a time
              </button>
            )}
          </label>
        )}

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "" | "low" | "medium" | "high")}
          className="rounded-sm border border-line px-2 py-1.5 text-sm"
        >
          <option value="">No priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tags, comma, separated"
          className="min-w-[10rem] flex-1 rounded-sm border border-line px-2 py-1.5 text-sm"
        />

        <select
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          className="rounded-sm border border-line px-2 py-1.5 text-sm"
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-between pt-1">
        <button
          type="button"
          onClick={() => {
            resetForm();
            setExpanded(false);
          }}
          className="text-xs text-ink/50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          style={{ backgroundColor: color }}
          className="rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-40"
        >
          {busy ? "Adding…" : "Add task"}
        </button>
      </div>
    </form>
  );
}
