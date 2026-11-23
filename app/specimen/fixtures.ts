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

const stress = (length: number) => 'Longsyntheticfirstname'.repeat(12).slice(0, length)

export const longHolderRows = [
  { name: 'Rahul Venkataraghavan', word: 'Sivasubramanian', initials: 'SK' },
  { name: 'Chinwe Eze-Lindqvist', word: 'Jean-Baptiste', initials: 'JB' },
  { name: 'Aigerim Nurlanovna Bekmukhambetova', word: 'Anna Marie-Ève', initials: 'AM' },
  { name: 'Zhang Wei', word: 'Maria Guadalupe', initials: 'MG' },
  { name: 'Leilani Kahananui-Ferreira', word: 'Ọláolúwa', initials: 'OO' },
  ...[64, 128, 255].map((length) => ({
    name: `Stress test, ${String(length)} characters`,
    word: stress(length),
    initials: 'LS',
  })),
]
