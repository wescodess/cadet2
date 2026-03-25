import { z } from 'zod'

export const recommendationReviewStateValues = ['pending', 'flagged', 'resolved', 'dismissed'] as const
export const recommendationReviewTrustScoreValues = ['high', 'medium', 'low'] as const
export const recommendationReviewFreshnessLabelValues = ['current', 'stale', 'expired'] as const
export const recommendationReviewSupportStrengthValues = ['strong', 'adequate', 'weak', 'unsupported'] as const
export const recommendationReviewRunStatusValues = ['completed', 'degraded', 'failed'] as const

export const recommendationReviewStateSchema = z.enum(recommendationReviewStateValues)
export const recommendationReviewTrustScoreSchema = z.enum(recommendationReviewTrustScoreValues)
export const recommendationReviewFreshnessLabelSchema = z.enum(recommendationReviewFreshnessLabelValues)
export const recommendationReviewSupportStrengthSchema = z.enum(recommendationReviewSupportStrengthValues)
export const recommendationReviewRunStatusSchema = z.enum(recommendationReviewRunStatusValues)

export const recommendationReviewActionInputSchema = z.object({
  reason: z.string().trim().min(1).max(500),
}).strict()

export const recommendationReviewCitationFlagInputSchema = z.object({
  reason: z.string().trim().min(1).max(500),
}).strict()

export type RecommendationReviewState = z.infer<typeof recommendationReviewStateSchema>
export type RecommendationReviewTrustScore = z.infer<typeof recommendationReviewTrustScoreSchema>
export type RecommendationReviewFreshnessLabel = z.infer<typeof recommendationReviewFreshnessLabelSchema>
export type RecommendationReviewSupportStrength = z.infer<typeof recommendationReviewSupportStrengthSchema>
export type RecommendationReviewRunStatus = z.infer<typeof recommendationReviewRunStatusSchema>
export type RecommendationReviewActionInput = z.infer<typeof recommendationReviewActionInputSchema>
export type RecommendationReviewCitationFlagInput = z.infer<typeof recommendationReviewCitationFlagInputSchema>
