export interface ContrastRecord {
  roles: string[]
  theme: { light: Record<string, string>; dark: Record<string, string> }
}

export interface ContrastRow {
  kind: 'text' | 'non-text'
  minimum: number
  fg: string
  bg: string
  use: string
  light: number
  dark: number
  passes: boolean
}

export const outputPath: string
export function contrast(a: string, b: string): number
export function rows(record: ContrastRecord): ContrastRow[]
export function render(record: ContrastRecord): string
export function readRecord(): ContrastRecord
