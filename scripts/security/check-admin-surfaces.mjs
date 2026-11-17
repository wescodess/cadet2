import { resolve } from 'node:path'
import { inspectAdminSources, inspectBuiltAdminRoutes } from './admin-surfaces.mjs'

const root = resolve(process.argv[2] ?? '.')
const sources = inspectAdminSources(root)
const routes = inspectBuiltAdminRoutes(root)
console.log(
  `Admin surface guard: PASS (${sources.convex} Convex registrations, ${sources.http} HTTP files, ${routes.length} built routes)`,
)
