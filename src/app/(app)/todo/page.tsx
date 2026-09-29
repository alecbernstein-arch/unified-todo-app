"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { List, Task } from "@/lib/types";
import { TaskRow } from "@/components/TaskRow";
import { ListSidebar } from "@/components/ListSidebar";
import { ManualAddForm } from "@/components/ManualAddForm";
import { UndoToast, useUndoToast } from "@/components/UndoToast";
import { getListColor } from "@/lib/listColors";

function TodoPageInner() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  // Pre-selects whichever list a Dashboard tile was clicked for (e.g. /todo?list=<id>).
  // "Unassigned" is a real list now, so it arrives here the exact same way any
  // other list tile does — no special mode needed.
  const [activeListId, setActiveListId] = useState<string | null>(searchParams.get("list"));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const toast = useUndoToast();

  // --- Task drag-to-reorder state ---
  // Only meaningful (and only ever rendered) when viewing one specific list
  // with no active search — manual order doesn't have a coherent meaning
  // across a mixed/filtered set of tasks.
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [overTaskId, setOverTaskId] = useState<string | null>(null);
  const reorderable = Boolean(activeListId) && !search;

  async function load() {
    const params = new URLSearchParams();
    if (activeListId) params.set("list_id", activeListId);
    if (search) params.set("q", search);

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
    // Polling stands in for real-time push here — see README
    // "Why polling instead of Supabase Realtime" for the reasoning.
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListId, search]);

  async function handleDropTask(listId: string, taskId: string) {
    await apiFetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ list_id: listId }),
    });
    load();
  }

  function resetTaskDragState() {
    setDraggingTaskId(null);
    setDragPos(null);
    setOverTaskId(null);
  }

  function handleTaskHandlePointerDown(e: React.PointerEvent, taskId: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingTaskId(taskId);
    setDragPos({ x: e.clientX, y: e.clientY });
  }

  function handleTaskHandlePointerMove(e: React.PointerEvent) {
    if (!draggingTaskId) return;
    e.preventDefault();
    setDragPos({ x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest<HTMLElement>("[data-task-tile]");
    setOverTaskId(row?.dataset.taskTile ?? null);
  }

  async function handleTaskHandlePointerUp() {
    if (draggingTaskId) {
      const fromIndex = tasks.findIndex((t) => t.id === draggingTaskId);
      const toIndex = overTaskId ? tasks.findIndex((t) => t.id === overTaskId) : -1;
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const reordered = [...tasks];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        setTasks(reordered); // instant feedback
        try {
          await apiFetch("/api/tasks/reorder", {
            method: "POST",
            body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
          });
        } catch {
          load(); // saving the new order failed — fall back to what's actually saved
        }
      }
    }
    resetTaskDragState();
  }

  const activeList = lists.find((l) => l.id === activeListId) ?? null;
  const activeColor = getListColor(lists, activeListId);
  const draggedTask = draggingTaskId ? tasks.find((t) => t.id === draggingTaskId) ?? null : null;

  return (
    <div>
      {activeList ? (
        // Matches the Dashboard tile you tapped to get here.
        <div
          className="mb-5 rounded-lg p-5 shadow-sm"
          style={{ backgroundColor: activeColor }}
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-semibold text-white">
              {activeList.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <button
              onClick={() => setActiveListId(null)}
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white"
            >
              All lists
            </button>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {activeList.name}
          </h1>
          <p className="mt-0.5 text-sm text-white/80">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </p>
        </div>
      ) : (
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-ink">Todo</h1>
      )}

      <div className="mb-3">
        <ListSidebar
          lists={lists}
          activeListId={activeListId}
          onSelect={setActiveListId}
          onDropTask={handleDropTask}
        />
      </div>

      <div className="mb-4">
        <ManualAddForm lists={lists} defaultListId={activeListId} onAdded={load} />
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tasks…"
        className="mb-3 w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
      />

      {reorderable && tasks.length > 1 && (
        <p className="mb-2 text-xs text-ink/50">Drag the ☰ handle to reorder tasks in this list.</p>
      )}

      {loading ? (
        <p className="text-sm text-ink/70">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-ink/70">Nothing here yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              lists={lists}
              onChanged={load}
              onCompleted={(message) => {
                toast.show(message);
                load();
              }}
              reorderable={reorderable}
              isDragging={draggingTaskId === task.id}
              isDropTarget={overTaskId === task.id && draggingTaskId !== null && draggingTaskId !== task.id}
              onHandlePointerDown={(e) => handleTaskHandlePointerDown(e, task.id)}
              onHandlePointerMove={handleTaskHandlePointerMove}
              onHandlePointerUp={handleTaskHandlePointerUp}
              onHandlePointerCancel={resetTaskDragState}
            />
          ))}
        </div>
      )}

      {/* Floating pill following the finger/cursor while reordering a task */}
      {draggingTaskId && dragPos && draggedTask && (
        <div
          style={{
            position: "fixed",
            left: dragPos.x,
            top: dragPos.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 50,
          }}
          className="max-w-[80vw] truncate rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-2xl"
        >
          {draggedTask.title}
        </div>
      )}

      <UndoToast message={toast.message} onUndo={load} onDismiss={toast.dismiss} />
    </div>
  );
}

export default function TodoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink/70">Loading…</p>}>
      <TodoPageInner />
    </Suspense>
  );
}
