import { relayStates, type RelayStateId } from '~/lib/relay/states'

const counts: Partial<Record<RelayStateId, number>> = {
  'signed-version': 2,
  'due-90': 40,
  'due-180': 117,
}

export const stateGroups = [...new Set(relayStates.map((state) => state.group))].map((name) => ({
  name,
  states: relayStates
    .filter((state) => state.group === name)
    .map((state) => ({ id: state.id, count: counts[state.id] })),
}))
