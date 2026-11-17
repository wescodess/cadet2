import { defineEventHandler, getRequestURL } from 'h3'
import { requireAdminSession } from '../utils/auth/requireAdminSession'

export default defineEventHandler(async (event) => {
  const path = decodeURIComponent(getRequestURL(event).pathname)
    .replaceAll('\\', '/')
    .replace(/\/{2,}/g, '/')
  if (/^\/(admin|ai-search)(\/|$)/.test(path)) await requireAdminSession(event)
})
