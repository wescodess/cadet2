export function hasControlCharacters(value: unknown): boolean {
  if (typeof value === 'string') return /\p{Cc}/u.test(value)
  if (Array.isArray(value)) return value.some(hasControlCharacters)
  if (value && typeof value === 'object') return Object.values(value).some(hasControlCharacters)
  return false
}
