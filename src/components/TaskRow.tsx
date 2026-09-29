"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { apiFetch } from "@/lib/api-client";
import { isOverdue, List, Task } from "@/lib/types";
import { getListColor } from "@/lib/listColors";

/** "15:00" or "15:00:00" (native time input / Postgres format) -> "3:00 PM" */
function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}

function HandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function TaskRow({
  task,
  lists,
  onChanged,
  onCompleted,
  reorderable = false,
  isDragging = false,
  isDropTarget = false,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
}: {
  task: Task;
  lists: List[];
  onChanged: () => void;
  onCompleted: (message: string) => void;
  // All optional — reordering is opt-in per usage. The Todo page enables it
  // when viewing one specific list; nowhere else (Dashboard groups, "All
  // lists", search results) renders a handle at all, since manual order
  // only has a coherent meaning within a single list.
  reorderable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onHandlePointerDown?: (e: React.PointerEvent) => void;
  onHandlePointerMove?: (e: React.PointerEvent) => void;
  onHandlePointerUp?: () => void;
  onHandlePointerCancel?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function complete() {
    setBusy(true);
    try {
      await apiFetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      });
      onCompleted(`"${task.title}" completed`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function toggleInProgress() {
    const next = task.status === "in_progress" ? "not_started" : "in_progress";
    await apiFetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    onChanged();
  }

  async function moveTo(listId: string) {
    await apiFetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ list_id: listId }),
    });
    onChanged();
  }

  async function deleteTask() {
    await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onChanged();
  }

  async function saveEdits(fields: Partial<Task>) {
    await apiFetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    onChanged();
  }

  const overdue = isOverdue(task);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/task-id", task.id)}
      data-task-tile={task.id}
      className="rounded-md border border-line bg-surface px-4 py-3 transition-opacity"
      style={{
        borderLeft: `4px solid ${getListColor(lists, task.list_id)}`,
        opacity: isDragging ? 0.4 : 1,
        outline: isDropTarget ? "2px solid rgb(var(--amber))" : "2px solid transparent",
        outlineOffset: "-2px",
      }}
    >
      <div className="flex items-start gap-3">
        {reorderable && (
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              onHandlePointerDown?.(e);
            }}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerCancel}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
            style={{ touchAction: "none" }}
            className="mt-0.5 shrink-0 rounded p-1 text-ink/40 hover:text-ink"
            aria-label={`Drag to reorder ${task.title}`}
          >
            <HandleIcon />
          </button>
        )}
        <button
          disabled={busy}
          onClick={complete}
          aria-label="Complete task"
          className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-ink/50 transition-colors hover:border-amber hover:bg-amber/20"
        />

        <div className="min-w-0 flex-1">
          <button
            className="block w-full text-left text-sm font-medium text-ink"
            onClick={() => setExpanded((v) => !v)}
          >
            {task.title}
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/70">
            {task.due_date && (
              <span className={clsx(overdue && "font-medium text-overdue")}>
                {overdue ? "Overdue: " : "Due "}
                {task.due_date}
                {task.due_time && ` at ${formatTime12h(task.due_time)}`}
              </span>
            )}
            {task.priority && (
              <span
                className={clsx(
                  "flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium capitalize",
                  task.priority === "high" && "bg-overdue/15 text-overdue",
                  task.priority === "medium" && "bg-amber-soft text-ink",
                  task.priority === "low" && "bg-ink/10 text-ink/70"
                )}
              >
                <span
                  className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    task.priority === "high" && "bg-overdue",
                    task.priority === "medium" && "bg-amber",
                    task.priority === "low" && "bg-ink/40"
                  )}
                  aria-hidden="true"
                />
                {task.priority}
              </span>
            )}
            {task.tags.map((tag) => (
              <span key={tag} className="rounded-sm bg-ink/10 px-1.5 py-0.5">
                {tag}
              </span>
            ))}
            <button
              onClick={toggleInProgress}
              className={clsx(
                "rounded-sm px-2 py-1",
                task.status === "in_progress" ? "bg-amber-soft text-ink" : "bg-ink/10"
              )}
            >
              {task.status === "in_progress" ? "In progress" : "Not started"}
            </button>
          </div>
        </div>

        <select
          value={task.list_id}
          onChange={(e) => moveTo(e.target.value)}
          className="max-w-[7rem] shrink-0 rounded-sm border border-line bg-surface px-2 py-2 text-xs md:py-1.5"
          aria-label="Move to list"
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {expanded && (
        <EditPanel task={task} onSave={saveEdits} onDelete={deleteTask} onClose={() => setExpanded(false)} />
      )}
    </div>
  );
}

function EditPanel({
  task,
  onSave,
  onDelete,
  onClose,
}: {
  task: Task;
  onSave: (fields: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [hasDate, setHasDate] = useState(!!task.due_date);
  const [dueTime, setDueTime] = useState(task.due_time?.slice(0, 5) ?? ""); // trim seconds if present, for the <input type="time">
  const [hasTime, setHasTime] = useState(!!task.due_time);
  const [priority, setPriority] = useState(task.priority ?? "");
  const [tags, setTags] = useState(task.tags.join(", "));
  // Guards against a second tap/click landing on the "+ Add a date/time"
  // button the instant it reappears in the same spot right after removal —
  // some mobile browsers can re-fire a click on whatever's now under a
  // finger once the DOM changes mid-tap.
  const suppressNextAddRef = useRef(false);
  function suppressNextAddBriefly() {
    suppressNextAddRef.current = true;
    setTimeout(() => {
      suppressNextAddRef.current = false;
    }, 400);
  }

  async function handleSave() {
    await onSave({
      notes: notes || null,
      due_date: hasDate ? dueDate : null,
      due_time: hasDate && hasTime ? dueTime : null, // a time with no date wouldn't mean anything
      priority: (priority || null) as Task["priority"],
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onClose();
  }

  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
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
                if (suppressNextAddRef.current) return; // ignore a ghost click right after removing
                setHasDate(true);
                setDueDate(format(new Date(), "yyyy-MM-dd")); // a real default value, not a blank box
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
                  if (suppressNextAddRef.current) return; // ignore a ghost click right after removing
                  setHasTime(true);
                  setDueTime("09:00"); // a real default value, not a blank box
                }}
                className="rounded-sm border border-dashed border-line px-2 py-1.5 text-sm text-ink/60 hover:border-amber hover:text-amber"
              >
                + Add a time
              </button>
            )}
          </label>
        )}
        <select
          value={priority ?? ""}
          onChange={(e) => setPriority(e.target.value)}
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
      </div>
      <div className="flex justify-between">
        <button onClick={onDelete} className="text-xs text-overdue">
          Delete task
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-xs text-ink/70">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-sm bg-ink px-3.5 py-2 text-xs md:py-1.5 font-medium text-paper">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
