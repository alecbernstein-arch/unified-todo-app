"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { List } from "@/lib/types";
import { getListColor } from "@/lib/listColors";

/**
 * Full create/rename/delete UI for lists. Self-contained (fetches its own
 * data) so it can be dropped anywhere — currently used on both the
 * standalone Lists page (reached via the Dashboard's "+ New list" tile) and
 * inline in Settings, for a quicker path to deleting a list.
 */
export function ListManager() {
  const [lists, setLists] = useState<List[]>([]);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch<{ lists: List[] }>("/api/lists");
    setLists(res.lists);
  }

  useEffect(() => {
    load();
  }, []);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await apiFetch("/api/lists", { method: "POST", body: JSON.stringify({ name: newName.trim() }) });
    setNewName("");
    load();
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) return;
    await apiFetch(`/api/lists/${id}`, { method: "PATCH", body: JSON.stringify({ name: renameValue.trim() }) });
    setRenamingId(null);
    load();
  }

  async function deleteList(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/lists/${id}`, { method: "DELETE" });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form onSubmit={createList} className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list name…"
          className="flex-1 rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-40"
        >
          Create
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-overdue">{error}</p>}

      <div className="space-y-2">
        {lists.map((list) => (
          <div key={list.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: getListColor(lists, list.id) }}
                aria-hidden="true"
              />
              {renamingId === list.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => saveRename(list.id)}
                  onKeyDown={(e) => e.key === "Enter" && saveRename(list.id)}
                  className="flex-1 rounded-sm border border-line px-2 py-1 text-sm"
                />
              ) : (
                <span className="truncate text-sm text-ink">{list.name}</span>
              )}
            </div>
            <div className="flex gap-3 text-xs">
              <button
                onClick={() => {
                  setRenamingId(list.id);
                  setRenameValue(list.name);
                }}
                className="text-ink/70"
              >
                Rename
              </button>
              <button onClick={() => deleteList(list.id)} className="text-overdue">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
