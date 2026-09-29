"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { List } from "@/lib/types";

export function ManualAddForm({
  lists,
  defaultListId,
  onAdded,
}: {
  lists: List[];
  defaultListId: string | null;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [listId, setListId] = useState(defaultListId ?? lists[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  // useState's initial value only ever runs once, on mount — it doesn't
  // re-run just because defaultListId changes on a later render. Without
  // this, switching which list you're viewing (via the pills above) never
  // updated the dropdown here, since this form stays mounted the whole time.
  useEffect(() => {
    setListId(defaultListId ?? lists[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultListId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !listId) return;
    setBusy(true);
    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), list_id: listId }),
      });
      setTitle("");
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    // Stacks on narrow screens (title on its own row, list + Add below it)
    // so the Add button always has room and never gets clipped off the
    // right edge. Goes back to one row once there's enough width (sm+).
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="flex-1 rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
      />
      <div className="flex gap-2">
        <select
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          className="flex-1 rounded-md border border-line bg-surface px-2 py-2 text-sm sm:flex-none"
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="shrink-0 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </form>
  );
}
