export const oracle = {
  admission:
    '#74 AC1: "Guard all ten RAG source exports, source submissions/counts and AI Search page/API before reads/provider calls"; contract Boundaries: "No email, tokenIdentifier, caller actor ID or Nuxt allowlist supplies admin authority."',
  binding:
    'contract Boundaries: "the binding must match the JWT issuer and contain a non-future review time and operator evidence reference. No request can create that binding."',
  preserve:
    '#72 stories 92-96: "existing pathway/rules and evidence-source maintenance preserved"; "bounded governance review and audit without raw Client snapshots or Drafts".',
  private:
    'contract Private errors: "admitted errors, including 404 page documents and API responses, retain Cache-Control: private, no-store"; LR HTTP inventory: "All continuing private responses use explicit no-store DTOs."',
  frozen:
    'contract Private errors and frozen YouTube conflicts: "HTTP 409 Conflict", "YouTube source actions are frozen", "data.code: YOUTUBE_FROZEN"; "before writing".',
  off: 'qa/plans/portals-pilot.md J10 step 5: "Planner hard-off/AI Search admin-only off, YouTube cannot run on retry; no hidden public/portal recovery fallback."',
  clean:
    '#72 body L230: "Console errors, unhandled exceptions and unexpected failed requests fail"; qa/sessions/28-out-of-scope-74.md S4.',
}

export const pages = [
  ['/admin/pathways', /pathways|pathway inventory/i],
  ['/admin/pathway-rules', /pathway rules/i],
  ['/admin/evidence-sources', /evidence sources/i],
  ['/admin/rag-sources', /rag sources|source management|source registry/i],
  ['/admin/rag-phase0', /phase.?0|readiness/i],
  ['/admin/recommendation-reviews', /recommendation.*reviews/i],
  ['/admin/audit-trail', /audit trail/i],
  ['/ai-search', /ai search/i],
] as const

// Exact method/path inventory: docs/decisions/legacy-surface-removal.md L77-L87.
export const endpoints = [
  ['GET', '/api/admin/access'],
  ['GET', '/api/admin/pathways'],
  ['POST', '/api/admin/pathways'],
  ['GET', '/api/admin/pathways/qa74-missing'],
  ['PATCH', '/api/admin/pathways/qa74-missing'],
  ['PATCH', '/api/admin/pathways/qa74-missing/status'],
  ['GET', '/api/admin/pathways/qa74-missing/rules'],
  ['POST', '/api/admin/pathways/qa74-missing/rules'],
  ['PUT', '/api/admin/pathways/qa74-missing/rules'],
  ['PATCH', '/api/admin/pathways/qa74-missing/rules/qa74-missing'],
  ['DELETE', '/api/admin/pathways/qa74-missing/rules/qa74-missing'],
  ['GET', '/api/admin/audit-trail'],
  ['GET', '/api/admin/audit-trail/summary'],
  ['GET', '/api/admin/audit-trail/qa74-missing'],
  ['GET', '/api/admin/recommendation-reviews'],
  ['GET', '/api/admin/recommendation-reviews/qa74-missing'],
  ['GET', '/api/admin/recommendation-reviews/qa74-missing/citations'],
  ['POST', '/api/admin/recommendation-reviews/qa74-missing/flag'],
  ['POST', '/api/admin/recommendation-reviews/qa74-missing/dismiss'],
  ['POST', '/api/admin/recommendation-reviews/qa74-missing/resolve'],
  ['POST', '/api/admin/recommendation-reviews/qa74-missing/citations/qa74-missing/flag'],
  ['GET', '/api/admin/rag/phase0-readiness'],
  ['GET', '/api/admin/rag/sources/admin-status'],
  ['GET', '/api/admin/rag/sources'],
  ['POST', '/api/admin/rag/sources'],
  ['GET', '/api/admin/rag/sources/SOURCE'],
  ['PATCH', '/api/admin/rag/sources/SOURCE'],
  ['DELETE', '/api/admin/rag/sources/SOURCE'],
  ['POST', '/api/admin/rag/sources/SOURCE/approve'],
  ['POST', '/api/admin/rag/sources/SOURCE/reject'],
  ['POST', '/api/admin/rag/sources/SOURCE/pause'],
  ['POST', '/api/admin/rag/sources/SOURCE/resume'],
  ['POST', '/api/admin/rag/ingestion/run'],
  ['GET', '/api/admin/rag/ingestion/batches'],
  ['GET', '/api/admin/rag/ingestion/batches/BATCH'],
  ['POST', '/api/ai-search/query'],
] as const

export const grantPersonas = [
  'legacy',
  'wrongIssuer',
  'future',
  'missingEvidence',
  'tokenIdentifier',
  'emailOnly',
  'reviewed',
] as const
