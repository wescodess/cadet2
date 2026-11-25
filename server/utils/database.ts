import { db as hubDatabase } from 'hub:db'
import { DrizzleQueryError, type SQLWrapper } from 'drizzle-orm'

export type SqlExecutor = {
  execute(query: SQLWrapper): Promise<unknown>
}

type SqlDatabase = SqlExecutor & {
  transaction<T>(operation: (transaction: SqlExecutor) => Promise<T>): Promise<T>
}

export function getSqlDatabase(): SqlDatabase {
  return hubDatabase
}

export function isUniqueViolationError(error: unknown) {
  const cause = error instanceof DrizzleQueryError ? error.cause : error
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === '23505'
}
