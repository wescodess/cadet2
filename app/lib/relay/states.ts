export const relayRoles = [
  'positive',
  'negative',
  'caution',
  'progress',
  'seal',
  'scope',
  'history',
  'urgent',
] as const

export type RelayRole = (typeof relayRoles)[number]

export const relayGlyphs = [
  'alarm-clock',
  'archive',
  'badge-check',
  'ban',
  'calendar-clock',
  'calendar-search',
  'circle-arrow-out-up-right',
  'circle-check',
  'circle-dashed',
  'custom:circle-dashed-question',
  'custom:circle-question',
  'custom:disc-arrow',
  'custom:disc-check',
  'custom:fill-half',
  'custom:fill-quarter-dashed',
  'custom:fill-three-quarters',
  'file-check',
  'file-clock',
  'file-up',
  'file-x',
  'git-compare-arrows',
  'message-square-quote',
  'send',
  'siren',
] as const

export type RelayGlyph = (typeof relayGlyphs)[number]

export type RelayNeutralGlyph = 'circle-dashed' | 'circle-help' | 'inbox'

export interface RelayState {
  id: string
  group: string
  word: string
  role: RelayRole
  glyph: RelayGlyph
  fill: 'chip' | 'solid'
}

export const relayStates = [
  {
    id: 'supported',
    group: 'Assessment coverage',
    word: 'Supported',
    role: 'positive',
    glyph: 'circle-check',
    fill: 'chip',
  },
  {
    id: 'blocked',
    group: 'Assessment coverage',
    word: 'Blocked',
    role: 'negative',
    glyph: 'ban',
    fill: 'chip',
  },
  {
    id: 'unknown',
    group: 'Assessment coverage',
    word: 'Unknown',
    role: 'caution',
    glyph: 'custom:circle-dashed-question',
    fill: 'chip',
  },
  {
    id: 'out-of-scope',
    group: 'Assessment coverage',
    word: 'Out of scope',
    role: 'scope',
    glyph: 'circle-arrow-out-up-right',
    fill: 'chip',
  },
  {
    id: 'intake',
    group: 'Work status',
    word: 'Intake underway',
    role: 'caution',
    glyph: 'custom:fill-quarter-dashed',
    fill: 'chip',
  },
  {
    id: 'submitted',
    group: 'Work status',
    word: 'Submitted',
    role: 'progress',
    glyph: 'custom:fill-half',
    fill: 'chip',
  },
  {
    id: 'clarification',
    group: 'Work status',
    word: 'Clarification requested',
    role: 'caution',
    glyph: 'custom:circle-question',
    fill: 'chip',
  },
  {
    id: 'reviewing',
    group: 'Work status',
    word: 'Representative reviewing',
    role: 'progress',
    glyph: 'custom:fill-three-quarters',
    fill: 'chip',
  },
  {
    id: 'signed',
    group: 'Work status',
    word: 'Signed',
    role: 'seal',
    glyph: 'custom:disc-check',
    fill: 'chip',
  },
  {
    id: 'delivered',
    group: 'Work status',
    word: 'Delivered',
    role: 'positive',
    glyph: 'custom:disc-arrow',
    fill: 'chip',
  },
  {
    id: 'supplied',
    group: 'Evidence status',
    word: 'Supplied',
    role: 'caution',
    glyph: 'message-square-quote',
    fill: 'chip',
  },
  {
    id: 'uploaded',
    group: 'Evidence status',
    word: 'Uploaded',
    role: 'progress',
    glyph: 'file-up',
    fill: 'chip',
  },
  {
    id: 'awaiting',
    group: 'Evidence status',
    word: 'Awaiting review',
    role: 'progress',
    glyph: 'file-clock',
    fill: 'chip',
  },
  {
    id: 'accepted',
    group: 'Evidence status',
    word: 'Accepted',
    role: 'positive',
    glyph: 'file-check',
    fill: 'chip',
  },
  {
    id: 'replace',
    group: 'Evidence status',
    word: 'Replacement needed',
    role: 'negative',
    glyph: 'file-x',
    fill: 'chip',
  },
  {
    id: 'not-reviewed',
    group: 'Review validity',
    word: 'Not reviewed',
    role: 'caution',
    glyph: 'circle-dashed',
    fill: 'chip',
  },
  {
    id: 'signed-version',
    group: 'Review validity',
    word: 'Signed version {n}',
    role: 'seal',
    glyph: 'badge-check',
    fill: 'chip',
  },
  {
    id: 'changed',
    group: 'Review validity',
    word: 'Changed since review',
    role: 'caution',
    glyph: 'git-compare-arrows',
    fill: 'chip',
  },
  {
    id: 'superseded',
    group: 'Review validity',
    word: 'Superseded',
    role: 'history',
    glyph: 'archive',
    fill: 'chip',
  },
  {
    id: 'escalate',
    group: 'Urgency and escalation',
    word: 'Needs a licensed professional now',
    role: 'urgent',
    glyph: 'siren',
    fill: 'solid',
  },
  {
    id: 'due-90',
    group: 'Urgency and escalation',
    word: 'Expires in {n} days',
    role: 'urgent',
    glyph: 'alarm-clock',
    fill: 'solid',
  },
  {
    id: 'due-180',
    group: 'Urgency and escalation',
    word: 'Expires in {n} days',
    role: 'caution',
    glyph: 'calendar-clock',
    fill: 'chip',
  },
  {
    id: 'date-unknown',
    group: 'Urgency and escalation',
    word: 'Expiry date unknown',
    role: 'caution',
    glyph: 'calendar-search',
    fill: 'chip',
  },
  {
    id: 'review-requested',
    group: 'Work status',
    word: 'Review requested',
    role: 'progress',
    glyph: 'send',
    fill: 'chip',
  },
] as const satisfies readonly RelayState[]

export type RelayStateId = (typeof relayStates)[number]['id']

export function relayState(id: RelayStateId): RelayState {
  const state = relayStates.find((candidate) => candidate.id === id)
  if (!state) throw new Error(`Unknown Relay state: ${id}`)
  return state
}

export function relayStateWord(state: RelayState, count?: number) {
  if (!state.word.includes('{n}')) return state.word
  if (count === undefined) throw new Error(`The "${state.id}" state needs a number`)
  return state.word.replace('{n}', String(count))
}
