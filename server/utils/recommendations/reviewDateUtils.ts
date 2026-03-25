/**
 * Shared date-string normalization for recommendation review services.
 *
 * This prevents duplication of the same helper across
 * `recommendationReviewService.ts` and `recommendationReviewStateService.ts`.
 */

export function toIsoString(value: number | string | Date): string {
    if (value instanceof Date) {
        return value.toISOString()
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}
