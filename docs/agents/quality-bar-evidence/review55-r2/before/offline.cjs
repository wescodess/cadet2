globalThis.fetch = async () => {
  throw new Error('induced network unavailable')
}
