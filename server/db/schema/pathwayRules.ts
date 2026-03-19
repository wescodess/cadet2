import {
  foreignKey,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { pathwayDefinitions } from './pathwayDefinitions'

export const pathwayRules = pgTable('pathway_rules', {
  id: varchar('id', { length: 120 }).primaryKey(),
  pathwayId: varchar('pathway_id', { length: 100 }).notNull(),
  unmetConditionId: varchar('unmet_condition_id', { length: 160 }).notNull(),
  fieldPath: varchar('field_path', { length: 120 }).notNull(),
  operator: varchar('operator', { length: 8 }).notNull(),
  comparisonValue: jsonb('comparison_value').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  pathwayDefinitionFk: foreignKey({
    name: 'pathway_rules_pathway_id_fkey',
    columns: [table.pathwayId],
    foreignColumns: [pathwayDefinitions.pathwayId],
  }).onDelete('cascade'),
  pathwayConditionUnique: uniqueIndex('pathway_rules_pathway_condition_unique').on(table.pathwayId, table.unmetConditionId),
}))
