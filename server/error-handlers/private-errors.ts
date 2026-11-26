import '../types/nuxt-error-renderer'
import { send, setResponseHeader, setResponseHeaders, setResponseStatus } from 'h3'
import { defineNitroErrorHandler } from 'nitropack/runtime'
import renderNuxtError from '#nuxt-error-renderer'

export default defineNitroErrorHandler(async (error, event, { defaultHandler }) => {
  setResponseHeader(event, 'cache-control', 'private, no-store')
  try {
    const privateHandler: typeof defaultHandler = async (...args) => {
      const response = await defaultHandler(...args)
      response.headers['cache-control'] = 'private, no-store'
      return response
    }
    const target = event.path.split('?', 1)[0] || '/'
    const canonical = new URL(target.replace(/^[/\\]+/, '/'), 'http://error.invalid').pathname
    if (target === canonical && !/^\/api(?:\/|$)/i.test(canonical)) {
      await renderNuxtError(error, event, { defaultHandler: privateHandler })
    }
    if (event.handled) return
    const response = await privateHandler(error, event, { json: true })
    setResponseHeaders(event, response.headers)
    setResponseStatus(event, response.status, response.statusText)
    await send(event, JSON.stringify(response.body, null, 2))
  } catch (failure) {
    console.error('[private-errors] error response failed; sent the fixed 500', {
      failure,
      error,
    })
    if (event.handled) return
    setResponseHeaders(event, {
      'cache-control': 'private, no-store',
      'content-type': 'application/json',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "script-src 'none'; frame-ancestors 'none';",
    })
    setResponseStatus(event, 500, 'Server Error')
    await send(
      event,
      JSON.stringify({
        error: true,
        statusCode: 500,
        statusMessage: 'Server Error',
        message: 'Server Error',
      }),
    )
  }
})
