function fieldJson(value: unknown) {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  )
}

export function changedSourceFields(
  current: Record<string, unknown>,
  initial: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(current).filter(([key, value]) => fieldJson(value) !== fieldJson(initial[key])),
  )
}
