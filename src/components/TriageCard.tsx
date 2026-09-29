"use client";

import { useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { apiFetch } from "@/lib/api-client";
import { List, TriageItem } from "@/lib/types";

const SWIPE_THRESHOLD = 90;

export function TriageCard({
  item,
  lists,
  onActed,
}: {
  item: TriageItem;
  lists: List[];
  onActed: (message: string) => void;
}) {
  const [listId, setListId] = useState(item.suggested_list_id ?? lists[0]?.id ?? "");
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  async function act(action: "accept" | "reject" | "snooze" | "ignore", extra?: Record<string, unknown>) {
    setDragX(0);
    await apiFetch(`/api/triage/${item.id}`, {
      method: "POST",
      body: JSON.stringify({ action, ...extra }),
    });
    const labels: Record<typeof action, string> = {
      accept: `Added "${item.title}" to your list`,
      reject: "Dismissed",
      snooze: "Snoozed",
      ignore: item.source === "email" ? `Ignoring future emails from ${item.sender_email}` : "Dismissed",
    };
    onActed(labels[action]);
  }

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    startX.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDragX(Math.max(0, e.clientX - startX.current));
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX > SWIPE_THRESHOLD) {
      act("ignore");
    } else {
      setDragX(0);
    }
  }

  const sourceLabel =
    item.source === "email" ? item.connected_accounts?.nickname ?? "Email" : "Calendar";

  return (
    <div className="relative overflow-hidden rounded-md border border-line">
      <div
        className="absolute inset-0 flex items-center bg-overdue px-4 text-sm font-medium text-paper"
        aria-hidden
      >
        Ignore {item.source === "email" ? "sender" : "event"}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ transform: `translateX(${dragX}px)`, transition: dragging.current ? "none" : "transform 150ms" }}
        className="relative bg-surface px-4 py-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/60">{sourceLabel}</span>
          {item.raw_date && (
            <span className="text-xs text-ink/60">{format(new Date(item.raw_date), "MMM d")}</span>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-ink">{item.title}</p>
        {item.preview && <p className="mt-0.5 truncate text-xs text-ink/70">{item.preview}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="rounded-sm border border-line bg-surface px-2.5 py-2 text-xs md:py-1.5"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => act("accept", { listId })}
            className="rounded-sm bg-ink px-3.5 py-2 text-xs md:py-1.5 font-medium text-paper"
          >
            Accept
          </button>
          <button onClick={() => act("reject")} className="rounded-sm bg-ink/10 px-3.5 py-2 text-xs md:py-1.5">
            Reject
          </button>
          <div className="relative">
            <button
              onClick={() => setSnoozeOpen((v) => !v)}
              className="rounded-sm bg-ink/10 px-3.5 py-2 text-xs md:py-1.5"
            >
              Snooze
            </button>
            {snoozeOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded-sm border border-line bg-surface p-1 shadow-md">
                <SnoozeOption
                  label="Tomorrow"
                  onClick={() => {
                    act("snooze", { snoozeUntil: addDays(new Date(), 1).toISOString() });
                    setSnoozeOpen(false);
                  }}
                />
                <SnoozeOption
                  label="Next week"
                  onClick={() => {
                    act("snooze", { snoozeUntil: addDays(new Date(), 7).toISOString() });
                    setSnoozeOpen(false);
                  }}
                />
                <label className="block cursor-pointer rounded-sm px-2.5 py-2 text-xs md:py-1.5 hover:bg-ink/10">
                  Custom date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-sm border border-line px-1 py-0.5 text-xs"
                    onChange={(e) => {
                      if (!e.target.value) return;
                      act("snooze", { snoozeUntil: new Date(e.target.value).toISOString() });
                      setSnoozeOpen(false);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
          <button
            onClick={() => act("ignore")}
            className="ml-auto rounded-sm bg-overdue/10 px-3.5 py-2 text-xs md:py-1.5 text-overdue"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}

function SnoozeOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full rounded-sm px-2 py-1 text-left text-xs hover:bg-ink/10">
      {label}
    </button>
  );
}
