export type List = {
  id: string;
  name: string;
  is_default: boolean;
  position: number;
  color: string | null; // user-chosen; falls back to the rotating palette by position when null
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  due_time: string | null; // "HH:MM" or "HH:MM:SS", optional, only meaningful alongside due_date
  priority: "low" | "medium" | "high" | null;
  list_id: string;
  lists?: { name: string } | null;
  tags: string[];
  position: number;
  status: "not_started" | "in_progress" | "done";
  source: "manual" | "email" | "calendar";
  source_ref: string | null;
  created_at: string;
  completed_at: string | null;
};

export type TriageItem = {
  id: string;
  source: "email" | "calendar";
  sender_email: string | null;
  title: string;
  preview: string | null;
  raw_date: string | null;
  suggested_list_id: string | null;
  state: string;
  connected_accounts?: { nickname: string } | null;
  lists?: { name: string } | null;
};

export function isOverdue(task: Task): boolean {
  // A task with no time set is never flagged overdue — a bare date isn't a
  // precise deadline, so there's no specific moment to have missed yet.
  if (!task.due_date || !task.due_time) return false;
  const due = new Date(`${task.due_date}T${task.due_time}`); // parsed as local time
  return due.getTime() < Date.now();
}
