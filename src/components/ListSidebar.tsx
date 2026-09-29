"use client";

import clsx from "clsx";
import { List } from "@/lib/types";
import { getListColor } from "@/lib/listColors";

export function ListSidebar({
  lists,
  activeListId,
  onSelect,
  onDropTask,
}: {
  lists: List[];
  activeListId: string | null;
  onSelect: (listId: string | null) => void;
  onDropTask: (listId: string, taskId: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
      <button
        onClick={() => onSelect(null)}
        className={clsx(
          "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
          activeListId === null ? "bg-ink text-paper" : "bg-ink/10 text-ink/75"
        )}
      >
        All lists
      </button>
      {lists.map((list) => {
        const color = getListColor(lists, list.id);
        const active = activeListId === list.id;
        return (
          <button
            key={list.id}
            onClick={() => onSelect(list.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/task-id");
              if (taskId) onDropTask(list.id, taskId);
            }}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "text-white" : "bg-ink/10 text-ink/75"
            )}
            style={active ? { backgroundColor: color } : undefined}
          >
            {!active && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
            )}
            {list.name}
          </button>
        );
      })}
    </div>
  );
}
