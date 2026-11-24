import type { H3Event } from 'h3'
import { createError } from 'h3'

// A single budget covers session, token, authority and subsequent admin operations,
// including complete response bodies. Periodic upstream bytes cannot extend it.
const ADMIN_REQUEST_TIMEOUT_MS = 10_000
const transports = new WeakMap<H3Event, typeof globalThis.fetch>()

export function adminRequestTransport(event: H3Event): typeof globalThis.fetch {
  const existing = transports.get(event)
  if (existing) return existing
  const controller = new AbortController()
  const abort = () => {
    controller.abort(new DOMException('Admin request cancelled', 'AbortError'))
  }
  const timer = setTimeout(() => {
    controller.abort(new DOMException('Admin request deadline exceeded', 'TimeoutError'))
  }, ADMIN_REQUEST_TIMEOUT_MS)
  const cleanup = () => {
    clearTimeout(timer)
    event.node.req.off('aborted', abort)
    event.node.res.off('close', cleanup)
    event.node.res.off('finish', cleanup)
    abort()
  }
  event.node.req.once('aborted', abort)
  event.node.res.once('close', cleanup)
  event.node.res.once('finish', cleanup)
  if ((event.node.req.destroyed && !event.node.req.complete) || event.node.res.destroyed) cleanup()

  const transport: typeof globalThis.fetch = async (input, init) => {
    const signals = [controller.signal]
    if (input instanceof Request) signals.push(input.signal)
    if (init?.signal) signals.push(init.signal)
    const signal = AbortSignal.any(signals)
    try {
      const response = await globalThis.fetch(input, { ...init, signal })
      // Consume under the same signal before handing the response to Convex or
      // auth. A header-only deadline would leave response.json() unbounded.
      const body = response.body ? await response.arrayBuffer() : null
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    } catch (error) {
      if (signal.aborted) {
        throw createError({ statusCode: 503, statusMessage: 'Admin upstream unavailable' })
      }
      throw error
    }
  }
  transports.set(event, transport)
  return transport
}
