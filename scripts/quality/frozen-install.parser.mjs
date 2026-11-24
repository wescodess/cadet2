import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser, positive } from './parser.mjs'

const MAX_COMPLETION_LOG_DELAY_MS = 50

const manifest = z
  .object({
    name: nonempty,
    type: z.literal('module'),
    private: z.literal(true),
    scripts: z.record(nonempty, nonempty),
    dependencies: z.record(nonempty, nonempty),
    devDependencies: z.record(nonempty, nonempty),
    packageManager: z.literal('pnpm@9.12.3'),
    pnpm: z
      .object({ overrides: z.record(nonempty, nonempty) })
      .strict()
      .optional(),
  })
  .strict()
const event = z.object({
  time: positive,
  hostname: nonempty,
  pid: positive,
  level: z.literal('debug'),
})
const events = z
  .tuple([
    event.extend({ name: z.literal('pnpm:scope'), selected: z.literal(1) }).strict(),
    event
      .extend({ name: z.literal('pnpm:package-manifest'), initial: manifest, prefix: nonempty })
      .strict(),
    event
      .extend({
        name: z.literal('pnpm:context'),
        currentLockfileExists: z.literal(true),
        storeDir: nonempty,
        virtualStoreDir: nonempty,
      })
      .strict(),
    event
      .extend({ name: z.literal('pnpm:execution-time'), startedAt: natural, endedAt: positive })
      .strict(),
  ])
  .superRefine((entries, context) => {
    const first = entries[0]
    const last = entries[3]
    if (
      entries.some(
        (entry, index) =>
          entry.pid !== first.pid ||
          entry.hostname !== first.hostname ||
          (index > 0 && entry.time < entries[index - 1].time),
      )
    )
      context.addIssue({ code: 'custom', message: 'Inconsistent install event stream' })
    if (
      last.startedAt > first.time ||
      last.endedAt < first.time ||
      last.time < last.endedAt ||
      last.time - last.endedAt > MAX_COMPLETION_LOG_DELAY_MS
    )
      context.addIssue({ code: 'custom', message: 'Inconsistent install completion time' })
  })
const stream = z
  .string()
  .min(1)
  .endsWith('\n')
  .transform((raw) => raw.trimEnd().split('\n'))
  .pipe(z.array(jsonOutput(z.unknown())))
  .pipe(events)
export const schema = z
  .object({
    status: z.literal(0),
    stdout: stream,
    stderr: z.literal(''),
    lockBefore: z.string().regex(/^[a-f0-9]{64}$/),
    lockAfter: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .refine(
    ({ lockBefore, lockAfter }) => lockBefore === lockAfter,
    'Frozen install changed the lockfile',
  )
export const parse = parser('frozen-lockfile install', schema)
