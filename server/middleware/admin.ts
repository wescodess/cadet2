import {
  createError,
  defineEventHandler,
  getHeader,
  getRequestURL,
  isError,
  sendRedirect,
  setResponseHeader,
} from 'h3'
import type { H3Event } from 'h3'
import { requireAdminSession } from '../utils/auth/requireAdminSession'

const deniedDocumentDestinations: Partial<Record<number, string>> = { 401: '/auth', 403: '/' }

function isPageDocumentRequest(event: H3Event, path: string) {
  return (
    ['GET', 'HEAD'].includes(event.method) &&
    !path.endsWith('/_payload.json') &&
    (getHeader(event, 'accept') ?? '').includes('text/html')
  )
}

export default defineEventHandler(async (event) => {
  let decoded: string
  try {
    decoded = decodeURIComponent(getRequestURL(event).pathname)
  } catch {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }
  const path = decoded
    .replaceAll('\\', '/')
    .replace(/\/{2,}/g, '/')
    .toLowerCase()
  if (!/^\/(admin|ai-search)(\/|$)/.test(path)) return
  try {
    await requireAdminSession(event)
  } catch (error) {
    const destination = isError(error) ? deniedDocumentDestinations[error.statusCode] : undefined
    if (!destination || !isPageDocumentRequest(event, path)) throw error
    return sendRedirect(event, destination)
  }
})
