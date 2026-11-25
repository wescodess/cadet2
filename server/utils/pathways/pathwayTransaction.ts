import { getSqlDatabase, type SqlExecutor } from '../database'
import { getPathwayDefinition } from './pathwayDefinitionService'
import type { PathwayDefinitionRecord } from './pathwayDefinitionSchema'

export function withPathwayTransaction<T>(
  pathwayId: string,
  operation: (transaction: SqlExecutor, pathway: PathwayDefinitionRecord) => Promise<T>,
): Promise<T> {
  return getSqlDatabase().transaction(async (transaction) => {
    const pathway = await getPathwayDefinition(pathwayId, transaction, true)
    if (!pathway) {
      throw createError({ statusCode: 404, statusMessage: 'Pathway definition not found' })
    }
    return operation(transaction, pathway)
  })
}
