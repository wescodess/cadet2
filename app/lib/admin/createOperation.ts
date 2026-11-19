export function createAdminOperation() {
  let previous = ''
  let key = ''
  return {
    headers(payload: unknown) {
      const serialized = JSON.stringify(payload)
      if (!key || serialized !== previous) {
        key = crypto.randomUUID()
        previous = serialized
      }
      return { 'Idempotency-Key': key }
    },
    complete() {
      key = ''
    },
  }
}
