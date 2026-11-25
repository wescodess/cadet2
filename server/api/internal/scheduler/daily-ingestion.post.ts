export default defineEventHandler(() => {
  throw createError({
    statusCode: 503,
    statusMessage: 'Scheduled ingestion is currently unavailable',
  })
})
