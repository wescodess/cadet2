import { defineEventHandler, getHeader, getRequestURL, isError, sendRedirect } from 'h3'
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
  const path = decodeURIComponent(getRequestURL(event).pathname)
    .replaceAll('\\', '/')
    .replace(/\/{2,}/g, '/')
  if (!/^\/(admin|ai-search)(\/|$)/.test(path)) return
  try {
    await requireAdminSession(event)
  } catch (error) {
    const destination = isError(error) ? deniedDocumentDestinations[error.statusCode] : undefined
    if (!destination || !isPageDocumentRequest(event, path)) throw error
    return sendRedirect(event, destination)
  }
})
