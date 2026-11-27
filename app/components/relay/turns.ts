export type RelayTurn = 'client' | 'representative' | 'done' | 'signed' | 'none'

export function holderPrefix(turn: RelayTurn) {
  return turn === 'client' || turn === 'representative' ? 'Whose turn:' : 'Status:'
}
