export function groupByField<T>(
  items: T[],
  keyFn: (item: T) => string,
): [string, T[]][] {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
}
