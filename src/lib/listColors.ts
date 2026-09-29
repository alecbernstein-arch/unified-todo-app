// A single, shared color-per-list mapping, so a given list always looks the
// same color everywhere it shows up — the Dashboard rows, the Todo page
// header when you're inside that list, the list switcher pills, and the
// swatches on the Manage Lists / Colors pages.
//
// Each list can have its own explicitly-chosen `color` (see Settings ->
// Colors). When one hasn't been set, this falls back to a color derived
// from the list's position in the (consistently-ordered) /api/lists
// response, cycling through this palette.
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
  lists: { id: string; color?: string | null }[],
  listId: string | null | undefined
): string {
  if (!listId) return NEUTRAL_LIST_COLOR;
  const index = lists.findIndex((l) => l.id === listId);
  if (index === -1) return NEUTRAL_LIST_COLOR;
  const custom = lists[index].color;
  if (custom) return custom; // user-chosen color always takes priority
  return LIST_TILE_COLORS[index % LIST_TILE_COLORS.length];
}
