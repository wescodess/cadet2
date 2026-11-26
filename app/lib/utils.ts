import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'h1', 'h2', 'h3', 'body', 'ui', 'small', 'label', 'chip'],
      radius: ['control', 'input', 'card', 'chip', 'panel'],
      spacing: ['control', 'chip', 'pad', 'check-row'],
      leading: ['compact', 'label', 'small'],
      ease: ['standard'],
      animate: ['spin-save', 'spin-busy'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
