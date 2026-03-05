import type { BlockedPathwayOutcome, DirectPathwayOutcome } from './evaluateDirectAndBlockedPathways'
import type { MvpPathwayId } from './mvpPathwayCatalog'

export type ComposedPathwayOutcome = {
  pathwayId: MvpPathwayId
  type: 'composed'
  composedSteps: string[]
}

export type GenerateComposedPathwaysInput = {
  direct: DirectPathwayOutcome[]
  blocked: BlockedPathwayOutcome[]
}

export type GenerateComposedPathwaysResult = {
  composed: ComposedPathwayOutcome[]
  noComposedReason: string
}

function hasUnmetCondition(blockedPathway: BlockedPathwayOutcome, unmetConditionId: string) {
  return blockedPathway.unmetConditions.includes(unmetConditionId)
}

function buildComposedSteps(
  blockedPathway: BlockedPathwayOutcome,
  directPathwayIds: Set<MvpPathwayId>,
): string[] {
  const bridgePathway = directPathwayIds.has('mvp-skilled-worker')
    ? 'mvp-skilled-worker'
    : directPathwayIds.has('mvp-study-to-work')
      ? 'mvp-study-to-work'
      : directPathwayIds.has('mvp-provincial-nominee')
        ? 'mvp-provincial-nominee'
        : null

  if (!bridgePathway) {
    return []
  }

  if (blockedPathway.pathwayId === 'mvp-provincial-nominee') {
    if (hasUnmetCondition(blockedPathway, 'requires-valid-job-offer')) {
      return [bridgePathway, 'secure-valid-job-offer']
    }

    if (hasUnmetCondition(blockedPathway, 'requires-relocation-flexibility')) {
      return [bridgePathway, 'expand-relocation-scope']
    }
  }

  if (blockedPathway.pathwayId === 'mvp-study-to-work') {
    if (hasUnmetCondition(blockedPathway, 'minimum-budget-25000-cad')) {
      return [bridgePathway, 'build-study-budget']
    }

    if (hasUnmetCondition(blockedPathway, 'requires-study-or-retraining-intent')) {
      return [bridgePathway, 'commit-to-study-upgrade']
    }

    if (hasUnmetCondition(blockedPathway, 'minimum-timeline-10-months')) {
      return [bridgePathway, 'extend-planning-timeline']
    }
  }

  if (blockedPathway.pathwayId === 'mvp-skilled-worker') {
    if (
      hasUnmetCondition(blockedPathway, 'minimum-english-clb-8')
      || hasUnmetCondition(blockedPathway, 'minimum-skilled-experience-2-years')
    ) {
      return [bridgePathway, 'gain-targeted-work-and-language-proof']
    }

    if (hasUnmetCondition(blockedPathway, 'minimum-settlement-funds-15000-cad')) {
      return [bridgePathway, 'stabilize-settlement-funds']
    }
  }

  return []
}

export function generateComposedPathways(
  input: GenerateComposedPathwaysInput,
): GenerateComposedPathwaysResult {
  const directPathwayIds = new Set(input.direct.map(pathway => pathway.pathwayId))

  if (input.blocked.length === 0) {
    return {
      composed: [],
      noComposedReason: 'All supported pathways are already direct-fit in the current MVP scope.',
    }
  }

  if (directPathwayIds.size === 0) {
    return {
      composed: [],
      noComposedReason: 'No currently viable direct pathway is available to anchor a composed route in the MVP scope.',
    }
  }

  const composed: ComposedPathwayOutcome[] = []

  for (const blockedPathway of [...input.blocked].sort((left, right) => left.pathwayId.localeCompare(right.pathwayId))) {
    const composedSteps = buildComposedSteps(blockedPathway, directPathwayIds)
    if (composedSteps.length === 0) {
      continue
    }

    composed.push({
      pathwayId: blockedPathway.pathwayId,
      type: 'composed',
      composedSteps,
    })

    if (composed.length >= 2) {
      break
    }
  }

  return {
    composed,
    noComposedReason: composed.length > 0
      ? ''
      : 'No supported staged pathway is available for the current profile in this MVP release.',
  }
}
