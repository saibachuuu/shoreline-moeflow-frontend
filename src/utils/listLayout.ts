/** Keep layout columns separate from mobile page-size/keyboard handling. */
export function calculateColumns(
  width: number,
  columnWidth: number,
  minimum = 1,
): number {
  return Math.max(
    1,
    Math.floor(minimum),
    Math.floor(width / Math.max(1, columnWidth)),
  );
}
