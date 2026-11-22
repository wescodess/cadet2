import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const { SECURITY_OBSERVATIONS, SECURITY_PGLITE_MODULE } = process.env
const observe = (event) => appendFileSync(SECURITY_OBSERVATIONS, `${event}\n`)
const originalFetch = globalThis.fetch
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  observe(`fetch ${url.origin}${url.pathname}`)
  if (!['127.0.0.1', 'localhost'].includes(url.hostname))
    throw new Error('External network is forbidden in isolated security tests')
  return originalFetch(input, options)
}

const { PGlite } = await import(pathToFileURL(SECURITY_PGLITE_MODULE))
for (const method of ['query', 'exec']) {
  const original = PGlite.prototype[method]
  PGlite.prototype[method] = function (sql, ...args) {
    if (
      /\b(?:intake_draft|profile_snapshot|recommendation_profile|recommendation_run|pathway_definition|pathway_rule)\w*\b/i.test(
        sql,
      )
    )
      observe(`private-sql ${method}`)
    return original.call(this, sql, ...args)
  }
}
