export const canonicalRecommendationStatuses = ['queued', 'evaluating', 'completed', 'degraded', 'failed'] as const

export type RecommendationLifecycleStatus = typeof canonicalRecommendationStatuses[number]

export const recommendationStatusLabelMap: Record<RecommendationLifecycleStatus, string> = {
  queued: 'Queued',
  evaluating: 'Evaluating',
  completed: 'Completed',
  degraded: 'Degraded',
  failed: 'Failed',
}

export const recommendationStatusToneMap: Record<RecommendationLifecycleStatus, string> = {
  queued: 'bg-amber-50 text-amber-700 border-amber-200',
  evaluating: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  degraded: 'bg-orange-50 text-orange-700 border-orange-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function isCanonicalRecommendationStatus(value: string): value is RecommendationLifecycleStatus {
  return (canonicalRecommendationStatuses as readonly string[]).includes(value)
}

export function isInProgressStatus(status: RecommendationLifecycleStatus) {
  return status === 'queued' || status === 'evaluating'
}

export function getRecommendationStatusLabel(status: string) {
  return isCanonicalRecommendationStatus(status)
    ? recommendationStatusLabelMap[status]
    : status
}

export function getRecommendationStatusTone(status: string) {
  return isCanonicalRecommendationStatus(status)
    ? recommendationStatusToneMap[status]
    : 'bg-slate-100 text-slate-600 border-slate-200'
}

export function getDefaultStatusMessage(status: RecommendationLifecycleStatus) {
  switch (status) {
    case 'queued':
      return 'Recommendation processing is active and resumable while internal services catch up.'
    case 'evaluating':
      return 'Recommendation processing is actively evaluating your profile.'
    case 'completed':
      return 'Recommendation evaluation completed.'
    case 'degraded':
      return 'Recommendation evaluation completed with degraded quality.'
    case 'failed':
      return 'Recommendation evaluation failed and requires retry.'
  }
}
