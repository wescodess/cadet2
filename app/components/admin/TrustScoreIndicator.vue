<script setup lang="ts">
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-vue-next'
import { interfaceIconStroke } from '@/lib/relay/icons'

import { Badge } from '@/components/ui/badge'
import {
  formatRecommendationTrustScore,
  recommendationReviewTestIds,
  type RecommendationReviewTrustScore,
} from '@/lib/admin/recommendationReviews'
import { cn } from '@/lib/utils'

const props = defineProps<{
  score: RecommendationReviewTrustScore
}>()

const iconByScore = {
  high: CheckCircle2,
  medium: AlertTriangle,
  low: ShieldAlert,
} as const

const toneByScore = {
  high: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700',
  medium: 'border-amber-500/25 bg-amber-500/15 text-amber-700',
  low: 'border-rose-500/25 bg-rose-500/10 text-rose-700',
} as const
</script>

<template>
  <Badge
    :data-testid="recommendationReviewTestIds.trustScore"
    :class="
      cn(
        'gap-2 border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
        toneByScore[score],
      )
    "
    variant="outline"
  >
    <component :stroke-width="interfaceIconStroke" :is="iconByScore[score]" class="size-3.5" />
    {{ formatRecommendationTrustScore(score) }}
  </Badge>
</template>
