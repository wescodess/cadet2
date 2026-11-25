import '../types/admin-error-renderer'
import { send, setResponseHeaders, setResponseStatus } from 'h3'
import { defineNitroErrorHandler } from 'nitropack/runtime'
import renderNuxtError from '#admin-error-renderer'

export default defineNitroErrorHandler(async (error, event, { defaultHandler }) => {
  if (event.context.admittedAdmin !== true) return
  const privateHandler: typeof defaultHandler = async (...args) => {
    const response = await defaultHandler(...args)
    response.headers['cache-control'] = 'private, no-store'
    return response
  }
  await renderNuxtError(error, event, { defaultHandler: privateHandler })
  if (event.handled) return
  const response = await privateHandler(error, event)
  setResponseHeaders(event, response.headers)
  setResponseStatus(event, response.status, response.statusText)
  return send(event, JSON.stringify(response.body, null, 2))
})
