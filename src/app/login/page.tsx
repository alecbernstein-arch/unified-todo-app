"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Incorrect passcode");
      }
      router.push("/todo");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="mb-10">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-amber text-paper">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Todo</h1>
          <p className="mt-1.5 text-base text-ink/70">Enter your passcode to continue.</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-4 py-3.5 text-lg tracking-[0.3em] text-ink outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
          placeholder="••••"
        />
        {error && <p className="mt-3 text-sm text-overdue">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-md bg-ink py-3.5 text-base font-semibold text-paper disabled:opacity-40"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
