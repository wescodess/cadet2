import type { WorkspaceSummary, WorkspaceSummaryActionKey, WorkspaceSummaryActivity, WorkspaceSummaryDraft, WorkspaceSummaryRun } from '~~/shared/types/workspace-summary'

export type WorkspaceResolvedAction = {
  key: WorkspaceSummaryActionKey
  label: string
  description: string
  kind: 'navigate' | 'refresh'
  href?: string
}

export type WorkspaceTimelineItem = {
  key: 'intake-saved' | 'latest-run-generated' | 'latest-comparison-available' | 'next-step-plan-available'
  label: string
  description: string
  complete: boolean
}

function buildComparePath(summary: WorkspaceSummary) {
  if (!summary.comparison.available || !summary.comparison.baselineRunId || !summary.comparison.currentRunId) {
    return undefined
  }

  return `/workspace/compare?runA=${encodeURIComponent(summary.comparison.baselineRunId)}&runB=${encodeURIComponent(summary.comparison.currentRunId)}`
}

function buildStartNewCyclePath(summary: WorkspaceSummary) {
  const sourceRun = summary.latestRun?.id
  if (!sourceRun) {
    return '/workspace/intake?mode=new-cycle'
  }

  return `/workspace/intake?mode=new-cycle&sourceRun=${encodeURIComponent(sourceRun)}`
}

function buildReviewPath(_summary: WorkspaceSummary) {
  return '/workspace/recommendations'
}

export function formatWorkspaceSummaryTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'No saved time'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'No saved time'
  }

  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getWorkspaceStateLabel(summary: WorkspaceSummary) {
  if (
    summary.state === 'review-latest-run'
    && summary.latestRun
    && (!summary.latestReviewRun || summary.latestRun.id !== summary.latestReviewRun.id)
  ) {
    return 'Latest cycle in progress'
  }

  switch (summary.state) {
    case 'first-run':
      return 'First planning cycle'
    case 'resume-intake':
      return 'Resume intake'
    case 'review-latest-run':
      return 'Review latest plan'
    case 'compare-latest-runs':
      return 'Compare latest runs'
    case 'refresh-plan':
      return 'Refresh plan'
  }
}

export function getWorkspaceHeroHeading(summary: WorkspaceSummary, firstName?: string | null) {
  const resolvedName = firstName?.trim() || 'there'

  if (
    summary.state === 'review-latest-run'
    && summary.latestRun
    && (!summary.latestReviewRun || summary.latestRun.id !== summary.latestReviewRun.id)
  ) {
    return `Welcome back, ${resolvedName}. Your latest planning cycle is still updating.`
  }

  switch (summary.state) {
    case 'first-run':
      return `Welcome to Cadet2, ${resolvedName}. Start your first planning cycle.`
    case 'resume-intake':
      return `Welcome back, ${resolvedName}. Resume your planning draft.`
    case 'review-latest-run':
      return `Welcome back, ${resolvedName}. Your latest plan is ready to review.`
    case 'compare-latest-runs':
      return `Welcome back, ${resolvedName}. Review what changed before your next move.`
    case 'refresh-plan':
      return `Welcome back, ${resolvedName}. Start a fresh planning cycle.`
  }
}

function buildDraftContext(draft: WorkspaceSummaryDraft) {
  if (!draft.exists) {
    return 'No intake draft is saved yet.'
  }

  return draft.currentSectionLabel
    ? `Saved intake progress remains available in ${draft.currentSectionLabel}.`
    : 'Saved intake progress is available to resume.'
}

function buildRunContext(run: WorkspaceSummaryRun | null) {
  if (!run) {
    return 'No recommendation run has been generated yet.'
  }

  return run.profileSnapshotSummary
}

export function getWorkspaceHeroDescription(summary: WorkspaceSummary) {
  if (
    summary.state === 'review-latest-run'
    && summary.latestRun
    && (!summary.latestReviewRun || summary.latestRun.id !== summary.latestReviewRun.id)
  ) {
    return 'Your newest planning cycle is active. Reopen it to monitor the current status while your preserved review history stays available for reference.'
  }

  if (summary.state === 'resume-intake') {
    return `${buildDraftContext(summary.draft)} Prior planning history stays preserved while you continue editing.`
  }

  if (summary.state === 'compare-latest-runs') {
    return 'Your preserved planning history now includes enough continuity to compare the latest meaningful change set before acting.'
  }

  if (summary.state === 'review-latest-run') {
    return `Your latest reviewable run is ready. ${buildRunContext(summary.latestReviewRun)}`
  }

  if (summary.state === 'refresh-plan') {
    return 'Your workspace history is preserved, but the next step is to start a new planning cycle or refresh from the latest saved context.'
  }

  return 'Build a reusable planning workspace that keeps your draft, run history, and comparisons together over time.'
}

export function getWorkspaceLastActivity(summary: WorkspaceSummary): WorkspaceSummaryActivity {
  return summary.lastActivity
}

export function getWorkspacePrimaryAction(summary: WorkspaceSummary): WorkspaceResolvedAction {
  switch (summary.nextAction.actionKey) {
    case 'start-intake':
      return {
        key: 'start-intake',
        label: 'Start guided intake',
        description: 'Create your first planning profile and recommendation run.',
        kind: 'navigate',
        href: '/workspace/intake',
      }
    case 'resume-intake':
      return {
        key: 'resume-intake',
        label: 'Resume intake',
        description: 'Continue the draft you already saved in this workspace.',
        kind: 'navigate',
        href: '/workspace/intake',
      }
    case 'review-latest-run':
      return {
        key: 'review-latest-run',
        label: 'Review current recommendations',
        description: 'Open the latest recommendation review surface for this workspace.',
        kind: 'navigate',
        href: buildReviewPath(summary),
      }
    case 'compare-latest-runs':
      return {
        key: 'compare-latest-runs',
        label: 'Compare latest change set',
        description: 'Open the latest preserved run comparison to review what changed.',
        kind: 'navigate',
        href: buildComparePath(summary),
      }
    case 'refresh-plan':
      return {
        key: 'refresh-plan',
        label: 'Refresh from latest profile',
        description: 'Create a new run from your latest preserved planning context without losing history.',
        kind: 'refresh',
      }
    case 'start-new-cycle':
    case 'open-history':
      return {
        key: 'open-history',
        label: 'Open archive',
        description: 'Review your preserved workspace history.',
        kind: 'navigate',
        href: '/workspace/history',
      }
  }
}

export function getWorkspaceSecondaryActions(summary: WorkspaceSummary) {
  const actions: WorkspaceResolvedAction[] = []

  if (summary.draft.exists) {
    actions.push({
      key: 'resume-intake',
      label: 'Resume intake edits',
      description: 'Continue editing the saved planning draft already in progress.',
      kind: 'navigate',
      href: '/workspace/intake',
    })
  }

  if (summary.latestReviewRun) {
    actions.push({
      key: 'review-latest-run',
      label: 'Review current recommendations',
      description: 'Open the current recommendation review surface.',
      kind: 'navigate',
      href: buildReviewPath(summary),
    })
  }

  if (summary.comparison.available) {
    actions.push({
      key: 'compare-latest-runs',
      label: 'Compare latest change set',
      description: 'Inspect what changed between the latest preserved runs.',
      kind: 'navigate',
      href: buildComparePath(summary),
    })
  }

  if (summary.archive.totalRuns > 0) {
    actions.push({
      key: 'open-history',
      label: 'Open archive',
      description: 'Browse preserved recommendation history and archived review contexts.',
      kind: 'navigate',
      href: '/workspace/history',
    })
  }

  actions.push({
    key: 'start-new-cycle',
    label: 'Start new cycle',
    description: 'Edit your intake inputs before creating the next recommendation cycle.',
    kind: 'navigate',
    href: buildStartNewCyclePath(summary),
  })

  if (summary.latestReviewRun) {
    actions.push({
      key: 'refresh-plan',
      label: 'Refresh from latest profile',
      description: 'Create a new linked run without losing current planning history.',
      kind: 'refresh',
    })
  }

  return actions
}

export function getWorkspaceTimelineItems(summary: WorkspaceSummary): WorkspaceTimelineItem[] {
  return [
    {
      key: 'intake-saved',
      label: 'Intake saved',
      description: summary.timeline.intakeSaved
        ? 'A workspace draft or submitted profile context exists.'
        : 'Save your intake once to preserve planning continuity.',
      complete: summary.timeline.intakeSaved,
    },
    {
      key: 'latest-run-generated',
      label: 'Latest run generated',
      description: summary.timeline.latestRunGenerated
        ? 'A preserved recommendation run is available in this workspace.'
        : 'Generate your first recommendation run to unlock review and history.',
      complete: summary.timeline.latestRunGenerated,
    },
    {
      key: 'latest-comparison-available',
      label: 'Latest comparison available',
      description: summary.timeline.latestComparisonAvailable
        ? 'Two preserved runs can be compared without losing context.'
        : 'A second comparable run is needed before comparison is available.',
      complete: summary.timeline.latestComparisonAvailable,
    },
    {
      key: 'next-step-plan-available',
      label: 'Next-step plan available',
      description: summary.timeline.nextStepPlanAvailable
        ? 'Actionable next steps are available from the latest reviewable run.'
        : 'Next-step guidance appears after a reviewable recommendation run is ready.',
      complete: summary.timeline.nextStepPlanAvailable,
    },
  ]
}
