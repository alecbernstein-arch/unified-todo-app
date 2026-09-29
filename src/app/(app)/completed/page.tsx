"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { List, Task } from "@/lib/types";

export default function CompletedPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const params = new URLSearchParams({ status: "done" });
    if (activeListId) params.set("list_id", activeListId);
    const [tasksRes, listsRes] = await Promise.all([
      apiFetch<{ tasks: Task[] }>(`/api/tasks?${params.toString()}`),
      apiFetch<{ lists: List[] }>("/api/lists"),
    ]);
    setTasks(tasksRes.tasks);
    setLists(listsRes.lists);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListId]);

  async function uncheck(taskId: string) {
    await apiFetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ uncomplete: true }),
    });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-ink">Completed</h1>

      <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveListId(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
            activeListId === null ? "bg-ink text-paper" : "bg-ink/10 text-ink/70"
          }`}
        >
          All lists
        </button>
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveListId(l.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              activeListId === l.id ? "bg-ink text-paper" : "bg-ink/10 text-ink/70"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink/70">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-ink/70">Nothing completed yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3">
              <div>
                <p className="text-sm text-ink line-through decoration-ink/30">{task.title}</p>
                <p className="text-xs text-ink/60">
                  {task.lists?.name} · completed{" "}
                  {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : ""}
                </p>
              </div>
              <button
                onClick={() => uncheck(task.id)}
                className="shrink-0 rounded-sm bg-ink/10 px-3.5 py-2 text-xs md:py-1.5 font-medium"
              >
                Uncheck
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
