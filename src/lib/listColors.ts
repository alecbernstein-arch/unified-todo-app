// A single, shared color-per-list mapping, so a given list always looks the
// same color everywhere it shows up — the Dashboard tile, the Todo page
// header when you're inside that list, the list switcher pills, and the
// swatches on the Manage Lists page.
//
// There's no color stored in the database — it's derived from a list's
// position in the (consistently-ordered) /api/lists response, cycling
// through this palette. Simple, and needs no schema change.
export const LIST_TILE_COLORS = [
  "#C2542D", // terracotta
  "#1C7C74", // teal
  "#4C4FCB", // indigo
  "#8B3A7A", // plum
  "#6B7A2A", // olive
  "#35618F", // slate blue
  "#C43D5C", // rose
  "#2F6B4F", // forest
];

// Used for "All lists" or anything with no specific list color.
export const NEUTRAL_LIST_COLOR = "#55555C";

export function getListColor(
  lists: { id: string }[],
  listId: string | null | undefined
): string {
  if (!listId) return NEUTRAL_LIST_COLOR;
  const index = lists.findIndex((l) => l.id === listId);
  if (index === -1) return NEUTRAL_LIST_COLOR;
  return LIST_TILE_COLORS[index % LIST_TILE_COLORS.length];
}
