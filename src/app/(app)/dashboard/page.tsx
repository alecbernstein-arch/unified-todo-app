"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, parseISO } from "date-fns";
import clsx from "clsx";
import { apiFetch } from "@/lib/api-client";
import { List, Task } from "@/lib/types";
import { LIST_TILE_COLORS } from "@/lib/listColors";
import { TaskRow } from "@/components/TaskRow";
import { UndoToast, useUndoToast } from "@/components/UndoToast";

type DayMode = "today" | "tomorrow" | "custom";

function getGreeting(name: string): string {
  const hour = new Date().getHours(); // uses the device's own clock/timezone
  let timeOfDay = "Good evening"; // covers 17:00–4:59
  if (hour >= 5 && hour < 12) timeOfDay = "Good morning";
  else if (hour >= 12 && hour < 17) timeOfDay = "Good afternoon";
  return name ? `${timeOfDay}, ${name}` : timeOfDay;
}

function HandleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const toast = useUndoToast();

  // --- Day view state (Today / Tomorrow / Custom) ---
  const [dayMode, setDayMode] = useState<DayMode>("today");
  const [customDate, setCustomDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  // Unassigned is a catch-all, not tied to any particular day — it always
  // shows everything in it, regardless of the Today/Tomorrow/Custom selection.
  const [allActiveTasks, setAllActiveTasks] = useState<Task[]>([]);
  const [dayLoading, setDayLoading] = useState(true);

  // --- Drag-to-reorder state (rows) ---
  // Dragging now only ever starts from the hamburger handle (via
  // setPointerCapture on pointerdown), so there's no more need to guess
  // whether a touch is a tap, a scroll, or the start of a drag — pressing
  // the handle unambiguously means "start dragging," immediately.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  async function loadTiles() {
    const [listsRes, settingsRes] = await Promise.all([
      apiFetch<{ lists: List[] }>("/api/lists"),
      apiFetch<{ settings: { user_name: string | null } }>("/api/settings"),
    ]);
    setLists(listsRes.lists);
    setUserName(settingsRes.settings.user_name ?? "");
    setLoading(false);
  }

  async function loadDayView() {
    setDayLoading(true);
    const params = new URLSearchParams();
    if (dayMode === "today") {
      params.set("due_before_or_on", format(new Date(), "yyyy-MM-dd")); // today + overdue
    } else if (dayMode === "tomorrow") {
      params.set("due_on", format(addDays(new Date(), 1), "yyyy-MM-dd"));
    } else {
      params.set("due_on", customDate);
    }

    const [dayRes, allRes] = await Promise.all([
      apiFetch<{ tasks: Task[] }>(`/api/tasks?${params.toString()}`),
      apiFetch<{ tasks: Task[] }>("/api/tasks"), // no date filter — defaults to every active task
    ]);
    setDayTasks(dayRes.tasks);
    setAllActiveTasks(allRes.tasks);
    setDayLoading(false);
  }

  function reloadEverything() {
    loadTiles();
    loadDayView();
  }

  useEffect(() => {
    loadTiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDayView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayMode, customDate]);

  function resetDragState() {
    setDraggingId(null);
    setDragPos(null);
    setOverId(null);
  }

  function handleHandlePointerDown(e: React.PointerEvent, listId: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation(); // don't let the row's own onClick (navigate) fire
    e.currentTarget.setPointerCapture(e.pointerId); // keep receiving move/up events even once the finger leaves this small icon
    setDraggingId(listId);
    setDragPos({ x: e.clientX, y: e.clientY });
  }

  function handleHandlePointerMove(e: React.PointerEvent) {
    if (!draggingId) return;
    e.preventDefault();
    setDragPos({ x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest<HTMLElement>("[data-list-tile]");
    setOverId(row?.dataset.listTile ?? null);
  }

  async function handleHandlePointerUp() {
    if (draggingId) {
      const fromIndex = lists.findIndex((l) => l.id === draggingId);
      const toIndex = overId ? lists.findIndex((l) => l.id === overId) : -1;
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const reordered = [...lists];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        setLists(reordered);
        try {
          await apiFetch("/api/lists/reorder", {
            method: "POST",
            body: JSON.stringify({ orderedIds: reordered.map((l) => l.id) }),
          });
        } catch {
          loadTiles();
        }
      }
    }
    resetDragState();
  }

  const draggedIndex = draggingId ? lists.findIndex((l) => l.id === draggingId) : -1;
  const draggedList = draggedIndex !== -1 ? lists[draggedIndex] : null;

  // Group tasks by list for the day-view sections. Every list uses the
  // selected day's tasks. The catch-all list (is_default) is left out of
  // this section entirely — it only ever shows up as a tile below, not as
  // a headed group up here.
  const groupedByList = lists
    .filter((list) => !list.is_default)
    .map((list) => ({
      list,
      tasks: dayTasks.filter((t) => t.list_id === list.id),
    }))
    .filter((g) => g.tasks.length > 0);

  // Tile counts: every list's tile reflects the selected day, except the
  // catch-all list, whose tile always shows everything in it.
  const counts: Record<string, number> = {};
  for (const list of lists) {
    const source = list.is_default ? allActiveTasks : dayTasks;
    counts[list.id] = source.filter((t) => t.list_id === list.id).length;
  }

  const customDateLabel =
    dayMode === "custom" ? format(parseISO(customDate), "EEEE, MMM d") : null;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="text-sm text-ink/75">{getGreeting(userName)}</p>
      <p className="mb-4 text-xs text-ink/60">Drag the ☰ handle to reorder a list.</p>

      {/* Today / Tomorrow / Custom */}
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setDayMode("today")}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-medium",
            dayMode === "today" ? "bg-amber text-ink" : "bg-ink/10 text-ink/75"
          )}
        >
          Today
        </button>
        <button
          onClick={() => setDayMode("tomorrow")}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-medium",
            dayMode === "tomorrow" ? "bg-amber text-ink" : "bg-ink/10 text-ink/75"
          )}
        >
          Tomorrow
        </button>
        {/* A genuinely visible native date input — clicking/tapping it opens the
            OS calendar picker on its own, reliably, on both Mac and iPhone. */}
        <input
          type="date"
          value={customDate}
          onChange={(e) => {
            if (!e.target.value) return;
            setCustomDate(e.target.value);
            setDayMode("custom");
          }}
          className={clsx(
            "rounded-full border-0 px-4 py-2 text-sm font-medium",
            dayMode === "custom" ? "bg-amber text-ink" : "bg-ink/10 text-ink/75"
          )}
        />
      </div>
      {dayMode === "custom" ? (
        <p className="-mt-4 mb-4 text-xs text-ink/60">Viewing {customDateLabel}</p>
      ) : (
        <p className="-mt-4 mb-4 text-xs text-ink/50">Tap the date field above to pick a custom day.</p>
      )}

      {/* Day view: grouped by type list */}
      <div className="mb-6 space-y-5">
        {dayLoading ? (
          <p className="text-sm text-ink/70">Loading…</p>
        ) : groupedByList.length === 0 ? (
          <p className="text-sm text-ink/70">Nothing due{dayMode === "today" ? " — you're clear for today" : ""}.</p>
        ) : (
          groupedByList.map(({ list, tasks }) => (
            <div key={list.id}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: LIST_TILE_COLORS[lists.findIndex((l) => l.id === list.id) % LIST_TILE_COLORS.length] }}
                  aria-hidden="true"
                />
                <h2 className="text-sm font-semibold text-ink">{list.name}</h2>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    lists={lists}
                    onChanged={reloadEverything}
                    onCompleted={(message) => {
                      toast.show(message);
                      reloadEverything();
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* List rows */}
      {loading ? (
        <p className="text-sm text-ink/70">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/lists")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line py-4 text-ink/60 transition-colors hover:border-amber hover:text-amber"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-sm font-medium">New list</span>
          </button>

          {lists.map((list, i) => {
            const isDragging = draggingId === list.id;
            const isDropTarget = overId === list.id && draggingId !== null && draggingId !== list.id;
            return (
              <div
                key={list.id}
                data-list-tile={list.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/todo?list=${list.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") router.push(`/todo?list=${list.id}`);
                }}
                style={{
                  backgroundColor: LIST_TILE_COLORS[i % LIST_TILE_COLORS.length],
                  opacity: isDragging ? 0.35 : 1,
                  outline: isDropTarget ? "3px solid white" : "3px solid transparent",
                  outlineOffset: "-3px",
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-4 text-left shadow-sm transition-opacity"
              >
                <button
                  onPointerDown={(e) => handleHandlePointerDown(e, list.id)}
                  onPointerMove={handleHandlePointerMove}
                  onPointerUp={handleHandlePointerUp}
                  onPointerCancel={() => resetDragState()}
                  onClick={(e) => e.stopPropagation()}
                  style={{ touchAction: "none" }}
                  className="shrink-0 rounded p-1.5 text-white/70 hover:text-white"
                  aria-label={`Drag to reorder ${list.name}`}
                >
                  <HandleIcon />
                </button>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-base font-semibold text-white">
                  {list.name.trim().charAt(0).toUpperCase() || "?"}
                </span>

                <span className="min-w-0 flex-1 truncate text-lg font-semibold leading-tight text-white">
                  {list.name}
                </span>

                <span className="flex shrink-0 items-center gap-1 text-sm text-white/80">
                  {counts[list.id] ?? 0} {counts[list.id] === 1 ? "task" : "tasks"}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating pill following the finger/cursor while dragging */}
      {draggingId && dragPos && draggedList && (
        <div
          style={{
            position: "fixed",
            left: dragPos.x,
            top: dragPos.y,
            transform: "translate(-50%, -50%)",
            backgroundColor: LIST_TILE_COLORS[draggedIndex % LIST_TILE_COLORS.length],
            pointerEvents: "none",
            zIndex: 50,
          }}
          className="flex items-center gap-2 rounded-full px-4 py-2 shadow-2xl"
        >
          <HandleIcon />
          <span className="whitespace-nowrap text-sm font-semibold text-white">{draggedList.name}</span>
        </div>
      )}

      <UndoToast message={toast.message} onUndo={reloadEverything} onDismiss={toast.dismiss} />
    </div>
  );
}
