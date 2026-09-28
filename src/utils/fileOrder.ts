/** Move, rather than swap, so all intervening pages retain their relative order. */
export function moveFile<T>(
  files: readonly T[],
  from: number,
  to: number,
): T[] {
  const result = [...files];
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    from >= files.length ||
    to < 0 ||
    to >= files.length ||
    from === to
  ) {
    return result;
  }
  const [file] = result.splice(from, 1) as [T];
  result.splice(to, 0, file);
  return result;
}

/** Follow the server's legacy order; do not approximate its numeric filename key. */
export function sortFilesByIds<T extends { id: string }>(
  files: readonly T[],
  ids: readonly string[],
): T[] {
  const positions = new Map(ids.map((id, index) => [id, index]));
  return [...files].sort(
    (a, b) =>
      (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
