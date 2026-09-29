"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export function useUndoToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  return {
    message,
    show: (m: string) => setMessage(m),
    dismiss: () => setMessage(null),
  };
}

export function UndoToast({
  message,
  onUndo,
  onDismiss,
}: {
  message: string | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!message) return null;

  async function handleUndo() {
    onDismiss();
    try {
      await apiFetch("/api/undo", { method: "POST" });
      onUndo();
    } catch {
      // If there's nothing left to undo (e.g. double-click), just ignore it.
    }
  }

  return (
    <div className="fixed left-1/2 z-20 flex w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink shadow-2xl bottom-[calc(env(safe-area-inset-bottom,0px)_+_84px)] md:bottom-6">
      <span className="min-w-0 truncate">{message}</span>
      <button onClick={handleUndo} className="shrink-0 font-semibold text-amber">
        Undo
      </button>
    </div>
  );
}
