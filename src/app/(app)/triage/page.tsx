"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { List, TriageItem } from "@/lib/types";
import { TriageCard } from "@/components/TriageCard";
import { UndoToast, useUndoToast } from "@/components/UndoToast";

export default function TriagePage() {
  const [items, setItems] = useState<TriageItem[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useUndoToast();

  async function load() {
    const [triageRes, listsRes] = await Promise.all([
      apiFetch<{ items: TriageItem[] }>("/api/triage"),
      apiFetch<{ lists: List[] }>("/api/lists"),
    ]);
    setItems(triageRes.items);
    setLists(listsRes.lists);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Poll so newly-synced items (from the cron job) show up without a manual refresh.
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-ink">Triage</h1>
      {loading ? (
        <p className="text-sm text-ink/70">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink/70">
          Nothing waiting right now. New emails and calendar events show up here after the
          next sync.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <TriageCard
              key={item.id}
              item={item}
              lists={lists}
              onActed={(message) => {
                toast.show(message);
                load();
              }}
            />
          ))}
        </div>
      )}
      <UndoToast message={toast.message} onUndo={load} onDismiss={toast.dismiss} />
    </div>
  );
}
