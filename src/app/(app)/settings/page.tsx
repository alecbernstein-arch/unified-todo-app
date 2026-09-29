"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { List } from "@/lib/types";
import { ListManager } from "@/components/ListManager";
import { EMAIL_FEATURE_ENABLED } from "@/lib/features";

type ConnectedAccount = {
  id: string;
  email_address: string;
  nickname: string;
  default_list_id: string | null;
  status: string;
};

type CalendarConnection = {
  id: string;
  icloud_username: string;
  default_list_id: string | null;
  status: string;
};

type IgnoredSender = { id: string; email_address: string; ignored_at: string };

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [calConnection, setCalConnection] = useState<CalendarConnection | null>(null);
  const [ignored, setIgnored] = useState<IgnoredSender[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [lookbackDays, setLookbackDays] = useState(14);
  const [userName, setUserName] = useState("");
  const [userNameSaved, setUserNameSaved] = useState(false);

  const [icloudUsername, setIcloudUsername] = useState("");
  const [icloudPassword, setIcloudPassword] = useState("");
  const [icloudError, setIcloudError] = useState<string | null>(null);
  const [icloudSaving, setIcloudSaving] = useState(false);

  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [passcodeMessage, setPasscodeMessage] = useState<string | null>(null);

  async function load() {
    const [accountsRes, calRes, ignoredRes, listsRes, settingsRes] = await Promise.all([
      EMAIL_FEATURE_ENABLED
        ? apiFetch<{ accounts: ConnectedAccount[] }>("/api/connected-accounts")
        : Promise.resolve({ accounts: [] }),
      apiFetch<{ connection: CalendarConnection | null }>("/api/caldav/connect"),
      EMAIL_FEATURE_ENABLED
        ? apiFetch<{ senders: IgnoredSender[] }>("/api/ignored-senders")
        : Promise.resolve({ senders: [] }),
      apiFetch<{ lists: List[] }>("/api/lists"),
      apiFetch<{ settings: { lookback_days: number; user_name: string | null } }>("/api/settings"),
    ]);
    setAccounts(accountsRes.accounts);
    setCalConnection(calRes.connection);
    setIgnored(ignoredRes.senders);
    setLists(listsRes.lists);
    setLookbackDays(settingsRes.settings.lookback_days);
    setUserName(settingsRes.settings.user_name ?? "");
  }

  useEffect(() => {
    load();
  }, []);

  async function updateAccountNickname(id: string, nickname: string) {
    await apiFetch(`/api/connected-accounts/${id}`, { method: "PATCH", body: JSON.stringify({ nickname }) });
    load();
  }
  async function updateAccountDefaultList(id: string, default_list_id: string) {
    await apiFetch(`/api/connected-accounts/${id}`, { method: "PATCH", body: JSON.stringify({ default_list_id }) });
    load();
  }
  async function disconnectAccount(id: string) {
    await apiFetch(`/api/connected-accounts/${id}`, { method: "DELETE" });
    load();
  }

  async function saveCalendarConnection(e: React.FormEvent) {
    e.preventDefault();
    setIcloudError(null);
    setIcloudSaving(true);
    try {
      await apiFetch("/api/caldav/connect", {
        method: "POST",
        body: JSON.stringify({ username: icloudUsername, appPassword: icloudPassword }),
      });
      setIcloudUsername("");
      setIcloudPassword("");
      load();
    } catch (err: any) {
      setIcloudError(err.message);
    } finally {
      setIcloudSaving(false);
    }
  }

  async function updateCalendarDefaultList(default_list_id: string) {
    if (!calConnection) return;
    await apiFetch(`/api/caldav/connection/${calConnection.id}`, {
      method: "PATCH",
      body: JSON.stringify({ default_list_id }),
    });
    load();
  }

  async function disconnectCalendar() {
    if (!calConnection) return;
    await apiFetch(`/api/caldav/connection/${calConnection.id}`, { method: "DELETE" });
    load();
  }

  async function unignore(id: string) {
    await apiFetch(`/api/ignored-senders/${id}`, { method: "DELETE" });
    load();
  }

  async function saveLookback() {
    await apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify({ lookback_days: lookbackDays }) });
  }

  async function saveUserName() {
    await apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify({ user_name: userName }) });
    setUserNameSaved(true);
    setTimeout(() => setUserNameSaved(false), 2000);
  }

  async function changePasscode(e: React.FormEvent) {
    e.preventDefault();
    setPasscodeMessage(null);
    try {
      await apiFetch("/api/auth/passcode", {
        method: "POST",
        body: JSON.stringify({ currentPasscode, newPasscode }),
      });
      setPasscodeMessage("Passcode updated.");
      setCurrentPasscode("");
      setNewPasscode("");
    } catch (err: any) {
      setPasscodeMessage(err.message);
    }
  }

  const connectError = searchParams.get("error");
  const justConnected = searchParams.get("connected");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>

      {EMAIL_FEATURE_ENABLED && connectError && (
        <p className="rounded-md bg-overdue/10 px-3 py-2 text-sm text-overdue">
          Couldn't connect: {connectError}
        </p>
      )}
      {EMAIL_FEATURE_ENABLED && justConnected && (
        <p className="rounded-md bg-amber-soft/50 px-3 py-2 text-sm text-ink">
          Connected {justConnected}. Give it a nickname below.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/70">Your name</h2>
        <p className="mb-2 text-xs text-ink/60">Used for the greeting at the top of the Dashboard.</p>
        <div className="flex max-w-xs gap-2">
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g. Alec"
            className="flex-1 rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
          />
          <button
            onClick={saveUserName}
            className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper"
          >
            {userNameSaved ? "Saved" : "Save"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/70">Manage lists</h2>
        <ListManager />
      </section>

      {EMAIL_FEATURE_ENABLED && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/70">Gmail accounts</h2>
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    defaultValue={account.nickname}
                    onBlur={(e) => e.target.value !== account.nickname && updateAccountNickname(account.id, e.target.value)}
                    className="rounded-sm border border-line px-2 py-1 text-sm font-medium"
                  />
                  <span className="text-xs text-ink/60">{account.email_address}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-ink/75">
                    Default list
                    <select
                      value={account.default_list_id ?? ""}
                      onChange={(e) => updateAccountDefaultList(account.id, e.target.value)}
                      className="rounded-sm border border-line px-2 py-2 text-xs md:py-1.5"
                    >
                      <option value="">No rule (falls back to your first list)</option>
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    {account.status === "needs_reauth" && (
                      <span className="text-xs text-overdue">Needs reconnecting</span>
                    )}
                    <button onClick={() => disconnectAccount(account.id)} className="text-xs text-overdue">
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <a
            href="/api/google/connect"
            className="mt-2 inline-block rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper"
          >
            Connect a Gmail account
          </a>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/70">iCloud Calendar</h2>
        {calConnection ? (
          <div className="rounded-md border border-line bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink">{calConnection.icloud_username}</span>
              {calConnection.status === "needs_reauth" && (
                <span className="text-xs text-overdue">Needs reconnecting</span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-ink/75">
                Default list
                <select
                  value={calConnection.default_list_id ?? ""}
                  onChange={(e) => updateCalendarDefaultList(e.target.value)}
                  className="rounded-sm border border-line px-2 py-2 text-xs md:py-1.5"
                >
                  <option value="">No rule (falls back to your first list)</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={disconnectCalendar} className="text-xs text-overdue">
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveCalendarConnection} className="space-y-2 rounded-md border border-line bg-surface p-3">
            <input
              value={icloudUsername}
              onChange={(e) => setIcloudUsername(e.target.value)}
              placeholder="Apple ID email"
              className="w-full rounded-sm border border-line px-2 py-1.5 text-sm"
            />
            <input
              type="password"
              value={icloudPassword}
              onChange={(e) => setIcloudPassword(e.target.value)}
              placeholder="App-specific password"
              className="w-full rounded-sm border border-line px-2 py-1.5 text-sm"
            />
            {icloudError && <p className="text-xs text-overdue">{icloudError}</p>}
            <button
              type="submit"
              disabled={icloudSaving || !icloudUsername || !icloudPassword}
              className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-40"
            >
              {icloudSaving ? "Checking…" : "Connect"}
            </button>
          </form>
        )}
      </section>

      {EMAIL_FEATURE_ENABLED && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/70">Ignored senders</h2>
          {ignored.length === 0 ? (
            <p className="text-sm text-ink/70">None yet.</p>
          ) : (
            <div className="space-y-1.5">
              {ignored.map((sender) => (
                <div key={sender.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-sm">
                  <span>{sender.email_address}</span>
                  <button onClick={() => unignore(sender.id)} className="text-xs text-ink/75">
                    Un-ignore
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/70">Sync lookback window</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={90}
            value={lookbackDays}
            onChange={(e) => setLookbackDays(Number(e.target.value))}
            className="w-20 rounded-sm border border-line px-2 py-1.5 text-sm"
          />
          <span className="text-sm text-ink/70">days</span>
          <button onClick={saveLookback} className="rounded-md bg-ink/10 px-3 py-1.5 text-sm font-medium">
            Save
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/70">Change passcode</h2>
        <form onSubmit={changePasscode} className="max-w-xs space-y-2">
          <input
            type="password"
            value={currentPasscode}
            onChange={(e) => setCurrentPasscode(e.target.value)}
            placeholder="Current passcode"
            className="w-full rounded-sm border border-line px-2 py-1.5 text-sm"
          />
          <input
            type="password"
            value={newPasscode}
            onChange={(e) => setNewPasscode(e.target.value)}
            placeholder="New passcode"
            className="w-full rounded-sm border border-line px-2 py-1.5 text-sm"
          />
          {passcodeMessage && <p className="text-xs text-ink/75">{passcodeMessage}</p>}
          <button type="submit" className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper">
            Update passcode
          </button>
        </form>
      </section>
    </div>
  );
}
