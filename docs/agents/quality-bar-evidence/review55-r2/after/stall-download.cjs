const real = globalThis.fetch
globalThis.fetch = (_url, options) => real(process.env.FIX_DOWNLOAD_URL, options)
