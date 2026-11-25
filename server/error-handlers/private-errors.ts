import '../types/nuxt-error-renderer'
import { getRequestURL, send, setResponseHeaders, setResponseStatus } from 'h3'
import { defineNitroErrorHandler } from 'nitropack/runtime'
import renderNuxtError from '#nuxt-error-renderer'

export default defineNitroErrorHandler(async (error, event, { defaultHandler }) => {
  const privateHandler: typeof defaultHandler = async (...args) => {
    const response = await defaultHandler(...args)
    response.headers['cache-control'] = 'private, no-store'
    return response
  }
  if (!/^\/api(?:\/|$)/i.test(getRequestURL(event).pathname)) {
    await renderNuxtError(error, event, { defaultHandler: privateHandler })
  }
  if (event.handled) return
  const response = await privateHandler(error, event, { json: true })
  setResponseHeaders(event, response.headers)
  setResponseStatus(event, response.status, response.statusText)
  return send(event, JSON.stringify(response.body, null, 2))
})
