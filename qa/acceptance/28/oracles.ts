// Independent expectations: issue/spec/decision text, never implementation tests.
const repo = 'https://github.com/wescodess/cadet2';
const lr = `${repo}/blob/4f06c9362dd4ef30bff4d4eab7cb113d90f6de94/docs/decisions/legacy-surface-removal.md`;
const ui = `${repo}/blob/92b9166a85c9a87cda45fb9df240c424c075add9/docs/decisions/surface-inventory-and-ui-batches.md`;
export const oracle = {
  close: `${repo}/issues/28 AC1: "Close /workspace and every descendant plus /api/workspace/*, /api/intake/* and /api/recommendations/runs/* before private reads/effects"; "Old result bookmarks return 404 without guessing a Signed plan."`,
  noEffects: `${lr}#L170: "Expect 404/no private payload and no data read/job/write/provider side effect."`,
  public: `${repo}/issues/28 AC2: "Close all 14 public recommendation exports and remove the tasks demo and unused public audit exports."`,
  replacement: `${repo}/issues/28 AC3: "Keep replacement capabilities unavailable until their own guarded slices land."`,
  tasks: `${lr}#L42: "Delete"; "Demo identity output is not a product capability"; ${ui}#L277: "Delete demo surface and links; no product replacement."`,
  landing: `${lr}#L40: "Replace with a minimal scope-honest public/auth entry"; "No recommendation or engine-readiness promise."`,
  auth: `${lr}#L41: "Keep as is as an authentication entry"; "preserve no post-login tasks/results redirect."`,
  helpers: `${lr}#L71: "Delete, not admin-only, internal or environment-gated in a deployed build."`,
  admin: `${lr}#L53: "Admin-only, keep existing inventory behavior"; ${lr}#L59: "keep governance audit views."`,
  j10: `${repo}/blob/759cd35eccae0a8665718defd79341de70f0ac8c/qa/plans/portals-pilot.md J10 step 3: "Old personalized paths 404 before reads/effects, no guessed signed redirect/start or fallback."`,
};

export const oldPages = [
  '/workspace', '/workspace/', '/workspace/intake', '/workspace/recommendations',
  '/workspace/recommendations/qa28-own-unsigned',
  '/workspace/recommendations/qa28-foreign-unsigned',
  '/workspace/recommendations/qa28-own-unsigned/pathways/qa28-pathway',
  '/workspace/history', '/workspace/compare?left=qa28-own-unsigned&right=qa28-foreign-unsigned',
  '/workspace/intake?sourceRunId=qa28-own-unsigned',
  '/workspace/recommendations?runId=qa28-own-unsigned&submitted=true',
  '/workspace/arbitrary/nested?runId=qa28-own-unsigned&mode=mock&force=true',
  '/tasks', '/tasks/', '/tasks/arbitrary/nested',
];
export const remainingPages = ['/','/auth','/admin/pathways','/admin/pathway-rules',
  '/admin/evidence-sources','/admin/rag-sources','/admin/rag-phase0',
  '/admin/recommendation-reviews','/admin/audit-trail','/ai-search'];

// LR L73-76: exact historical paths, plus descendant and SSR-payload probes.
export const oldApi = [
  '/api/workspace/me','/api/workspace/summary','/api/workspace/recommendation-runs',
  '/api/workspace/runs','/api/workspace/runs/qa28-own-unsigned','/api/workspace/runs/compare',
  '/api/intake/draft','/api/intake/submit',
  '/api/recommendations/runs/qa28-own-unsigned/status',
  '/api/recommendations/runs/qa28-own-unsigned/pathways',
  '/api/recommendations/runs/qa28-own-unsigned/results',
  '/api/recommendations/runs/qa28-own-unsigned/start',
  '/api/recommendations/runs/qa28-own-unsigned/refresh',
  '/api/workspace/arbitrary/nested','/api/intake/arbitrary/nested',
  '/api/recommendations/runs/arbitrary/nested',
  '/api/recommendations/testing/seed','/api/recommendations/testing/reset',
  '/workspace/_payload.json','/workspace/history/_payload.json',
  '/workspace/recommendations/qa28-own-unsigned/_payload.json',
  '/tasks/_payload.json',
];
export const exportsToClose: Array<[string,string]> = [
  ['query','tasks:list'],
  ...['recordAuditEvent','listAuditEvents','getAuditEvent','getAuditSummary'].map(n => [n==='recordAuditEvent'?'mutation':'query',`auditLog:${n}`] as [string,string]),
  ...['seedRunForUser','resetRunsForUser','createQueuedRun','startProcessingForUser',
    'writePathwayEvaluationForUser','writeRankedRecommendationsForUser','setTerminalStatusForUser'].map(n => ['mutation',`recommendationRuns:${n}`] as [string,string]),
  ...['listRunsForUserTesting','listForUser','readStatusForUser','readPathwayEvaluationForUser',
    'readRankedRecommendationsForUser','listForAdmin','readRankedRecommendationsForAdmin'].map(n => ['query',`recommendationRuns:${n}`] as [string,string]),
];
