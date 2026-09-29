-- Unified Todo App — Supabase schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`) before first deploy.

create extension if not exists "uuid-ossp";

-- Single-row table holding app-wide settings (this is a single-user app).
create table if not exists app_settings (
  id integer primary key default 1,
  passcode_hash text not null,
  lookback_days integer not null default 14,
  user_name text, -- shown in the Dashboard's time-of-day greeting
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

-- Lists are user-managed containers; every task belongs to exactly one.
create table if not exists lists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  is_default boolean not null default false,
  position integer not null default 0, -- display order on the Dashboard; user-reorderable
  color text, -- user-chosen hex color; falls back to the rotating palette by position when null
  created_at timestamptz not null default now()
);

-- One row per connected Gmail account (2-3 expected).
create table if not exists connected_accounts (
  id uuid primary key default uuid_generate_v4(),
  provider text not null default 'gmail',
  email_address text not null unique,
  nickname text not null,
  refresh_token_encrypted text not null,
  default_list_id uuid references lists(id) on delete set null,
  status text not null default 'active', -- active | needs_reauth
  created_at timestamptz not null default now()
);

-- Just one row expected: the single iCloud Calendar connection.
create table if not exists calendar_connections (
  id uuid primary key default uuid_generate_v4(),
  icloud_username text not null,
  icloud_app_password_encrypted text not null,
  default_list_id uuid references lists(id) on delete set null,
  status text not null default 'active', -- active | needs_reauth
  created_at timestamptz not null default now()
);

-- Persistent list of email addresses to silently filter out of future triage.
create table if not exists ignored_senders (
  id uuid primary key default uuid_generate_v4(),
  email_address text not null unique,
  ignored_at timestamptz not null default now()
);

-- Items surfaced from Gmail/iCloud awaiting a decision (Accept/Reject/Snooze/Ignore).
create table if not exists triage_items (
  id uuid primary key default uuid_generate_v4(),
  source text not null, -- 'email' | 'calendar'
  source_ref text not null, -- Gmail message id, or calendar event UID
  message_id text, -- RFC 5322 Message-ID header (email only) — used for cross-account de-dup
  source_account_id uuid references connected_accounts(id) on delete cascade,
  calendar_connection_id uuid references calendar_connections(id) on delete cascade,
  sender_email text, -- 'From' address, email items only
  title text not null,
  preview text,
  raw_date timestamptz,
  suggested_list_id uuid references lists(id) on delete set null,
  state text not null default 'pending', -- 'pending' | 'accepted' | 'rejected' | 'snoozed'
  snoozed_until timestamptz,
  created_at timestamptz not null default now()
);

-- A given email (by Message-ID) should only ever produce one triage item,
-- no matter how many connected accounts received a copy of it.
create unique index if not exists triage_items_message_id_unique
  on triage_items (message_id) where message_id is not null;

create index if not exists triage_items_state_idx on triage_items (state);
create index if not exists triage_items_sender_idx on triage_items (sender_email);

-- The actual todo items.
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  notes text,
  due_date date, -- date only, no time component (per PRD)
  due_time time, -- optional; only meaningful alongside due_date
  position integer not null default 0, -- manual drag order within a list (see /api/tasks/reorder)
  priority text, -- 'low' | 'medium' | 'high' | null
  list_id uuid not null references lists(id) on delete restrict,
  tags text[] not null default '{}',
  status text not null default 'not_started', -- 'not_started' | 'in_progress' | 'done'
  source text not null default 'manual', -- 'manual' | 'email' | 'calendar'
  source_ref text,
  source_account_id uuid references connected_accounts(id) on delete set null,
  triage_item_id uuid references triage_items(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tasks_list_idx on tasks (list_id);
create index if not exists tasks_status_idx on tasks (status);

-- Singleton row tracking the single most recent undoable action.
create table if not exists undo_state (
  id integer primary key default 1,
  action_type text, -- 'accept' | 'reject' | 'snooze' | 'ignore' | 'complete'
  payload jsonb,
  created_at timestamptz,
  constraint undo_state_singleton check (id = 1)
);

-- Seed the one built-in list, only if no default list exists yet.
-- Seed a starting "Unassigned" list for fresh installs — a real, ordinary
-- list (not protected — it can be renamed or deleted like any other) that's
-- first in position and flagged via is_default so the app can reliably
-- treat it as the catch-all regardless of what it's later renamed to.
insert into lists (name, position, is_default)
select 'Unassigned', -1, true
where not exists (select 1 from lists where is_default = true);

-- Seed app_settings with a placeholder passcode hash — REPLACE THIS before deploying.
-- See README "First deploy" section for how to generate a real hash.
insert into app_settings (id, passcode_hash)
values (1, 'REPLACE_WITH_REAL_PASSCODE_HASH')
on conflict (id) do nothing;

insert into undo_state (id, action_type, payload, created_at)
values (1, null, null, null)
on conflict (id) do nothing;
