import { defineEventHandler, getRequestURL, setResponseHeader, setResponseStatus } from 'h3'

const retiredRoots = [
  '/workspace',
  '/tasks',
  '/api/workspace',
  '/api/intake',
  '/api/recommendations/runs',
]

function normalizePath(path: string) {
  try {
    return decodeURIComponent(path).toLowerCase()
  } catch {
    return path.toLowerCase()
  }
}

export default defineEventHandler((event) => {
  const paths = [event.path.split('?', 1)[0] || '/', getRequestURL(event).pathname].map(
    normalizePath,
  )
  if (
    !paths.some((path) => retiredRoots.some((root) => path === root || path.startsWith(`${root}/`)))
  )
    return

  setResponseHeader(event, 'cache-control', 'private, no-store')
  setResponseStatus(event, 404)
  return { statusCode: 404, statusMessage: 'Not Found' }
})
