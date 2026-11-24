// @vitest-environment node
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'

const root = resolve('.')
const temporary = []
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true })
})
const block = (label) =>
  Array.from({ length: 24 }, (_, i) => `console.log('${label} operation ${i}', ${i} * 31)`).join(
    '\n',
  )
const component = (label) =>
  `<script setup lang="ts">\n${block(label)}\n</script>\n<template><p>${label}</p></template>\n`

function fixture(kind) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'duplication-population-')))
  temporary.push(directory)
  cpSync(join(root, 'scripts/quality'), join(directory, 'scripts/quality'), { recursive: true })
  mkdirSync(join(directory, 'node_modules/.bin'), { recursive: true })
  for (const name of readdirSync(join(root, 'node_modules')).filter((name) => name !== '.bin'))
    symlinkSync(join(root, 'node_modules', name), join(directory, 'node_modules', name), 'dir')
  const binary = join(directory, 'node_modules/.bin/jscpd')
  const native = join(root, 'node_modules/.bin/jscpd')
  symlinkSync(native, binary)
  writeFileSync(
    join(directory, '.gitignore'),
    'node_modules/\nscripts/\nevidence/\n.quality-output/\n',
  )
  writeFileSync(join(directory, 'package.json'), '{"name":"population-fixture","type":"module"}')
  writeFileSync(
    join(directory, 'scripts/quality/baselines/duplication.json'),
    JSON.stringify({
      date: '2026-11-21',
      commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
      counts: {},
    }),
  )
  function track() {
    for (const args of [
      ['init', '-q'],
      ['add', '.'],
      [
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        'commit',
        '-qm',
        'fixture',
      ],
    ])
      expect(spawnSync('git', args, { cwd: directory }).status).toBe(0)
    const objects = spawnSync('git', ['rev-parse', '--git-path', 'objects'], {
      cwd: root,
      encoding: 'utf8',
    })
    writeFileSync(
      join(directory, '.git/objects/info/alternates'),
      resolve(root, objects.stdout.trim()) + '\n',
    )
  }
  function row(name, environment = {}) {
    const evidence = join(directory, 'evidence', name)
    mkdirSync(evidence, { recursive: true })
    const result = spawnSync(process.execPath, ['scripts/quality/duplication.mjs'], {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...environment,
        QUALITY_BASE_REF: 'HEAD',
        QUALITY_OUTPUT_DIR: evidence,
      },
    })
    const output = result.stdout + result.stderr
    console.info(JSON.stringify({ kind, case: name, status: result.status, output }))
    return { status: result.status, output, evidence }
  }
  return { directory, binary, native, track, row }
}

for (const kind of ['empty', 'partial', 'vue-empty']) {
  it(
    'rejects a valid ' + kind + ' clone report after native scanning and restores a native control',
    () => {
      const { directory, binary, native, track, row } = fixture(kind)
      writeFileSync(join(directory, 'first.ts'), block('original'))
      writeFileSync(join(directory, 'second.ts'), block('different'))
      writeFileSync(join(directory, 'third.js'), block('javascript'))
      writeFileSync(join(directory, 'short.ts'), 'export const short = 1\n')
      const vue = kind === 'vue-empty'
      if (vue) {
        for (const file of ['first.ts', 'second.ts', 'third.js'])
          writeFileSync(join(directory, file), 'console.log(1)\n')
        writeFileSync(join(directory, 'first.vue'), component('original'))
        writeFileSync(join(directory, 'second.vue'), component('different'))
      }
      track()
      const unique = row('native-unique')
      expect(unique.status, unique.output).toBe(0)
      writeFileSync(
        join(directory, vue ? 'second.vue' : 'second.ts'),
        vue ? component('original') : block('original'),
      )
      const duplicate = row('native-clone')
      expect(duplicate.output).toMatch(/duplication regression|new files must be clean/)
      expect(duplicate.status).toBe(1)
      rmSync(binary)
      writeFileSync(
        binary,
        `#!/usr/bin/env node
      const { spawnSync } = require('node:child_process');
      const { readFileSync, writeFileSync } = require('node:fs');
      const args = process.argv.slice(2);
      const result = spawnSync(${JSON.stringify(native)}, args, { stdio: 'inherit' });
      const output = args[args.indexOf('--output') + 1];
      if (result.status === 0 && !args.includes('--complexity') && (${vue} || !output.endsWith('vue-population'))) {
        const path = output + '/jscpd-report.json';
        const report = JSON.parse(readFileSync(path, 'utf8'));
        report.duplicates = [];
        if (${JSON.stringify(kind)}.endsWith('empty')) report.statistics.formats = {};
        else delete report.statistics.formats.javascript;
        for (const stats of Object.values(report.statistics.formats)) {
          for (const key of ['clones', 'duplicatedLines', 'duplicatedTokens', 'percentage', 'percentageTokens']) stats[key] = 0;
        }
        for (const key of Object.keys(report.statistics.total)) report.statistics.total[key] = Object.values(report.statistics.formats).reduce((sum, stats) => sum + stats[key], 0);
        if (report.summary) {
          report.summary.files = report.summary.files.filter(file => !${JSON.stringify(kind)}.endsWith('empty') && file.format !== 'javascript');
          for (const file of report.summary.files) { file.duplicatedLines = 0; file.duplicatedTokens = 0; }
          report.summary.totalFiles = report.summary.files.length;
          report.summary.folders = []; report.summary.totalFolders = 0;
        }
        writeFileSync(path, JSON.stringify(report));
      }
      process.exit(result.status ?? 1);
    `,
        { mode: 0o755 },
      )
      const denied = row('lying-report')
      expect(denied.output).toMatch(/population|inventory/i)
      expect(denied.status).toBe(1)
      rmSync(binary)
      symlinkSync(native, binary)
      writeFileSync(
        join(directory, vue ? 'second.vue' : 'second.ts'),
        vue ? component('different') : block('different'),
      )
      const restored = row('restored-native')
      expect(restored.status, restored.output).toBe(0)
      for (const file of ['first.ts', 'second.ts', 'third.js'])
        writeFileSync(join(directory, file), 'console.log(1)\n')
      if (vue) {
        const tiny =
          '<script setup lang="ts">\nconst value = 1\n</script>\n<template>\n<p>{{ value }}</p>\n</template>\n\n\n\n\n'
        writeFileSync(join(directory, 'first.vue'), tiny)
        writeFileSync(join(directory, 'second.vue'), tiny)
      }
      expect(row('all-short-native').status).toBe(0)
    },
    30000,
  )
}

it.each([
  ['native output', 0, 0],
  ['62 MiB combined output', 31, 0],
  ['80 MiB combined output', 40, 1],
  ['single-phase overflow', 68, 1],
])(
  'shares the duplication capture budget for %s',
  (name, paddingMiB, expected) => {
    const { directory, binary, native, track, row } = fixture('capture')
    writeFileSync(join(directory, 'first.ts'), block('original'))
    writeFileSync(join(directory, 'second.ts'), block('different'))
    track()
    rmSync(binary)
    writeFileSync(
      binary,
      `#!/usr/bin/env node
    const { spawnSync } = require('node:child_process');
    const { writeSync } = require('node:fs');
    const result = spawnSync(${JSON.stringify(native)}, process.argv.slice(2), { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
    const block = Buffer.alloc(65536, 120);
    for (let remaining = Number(process.env.DUPLICATION_TEST_PADDING_BYTES); remaining > 0;) {
      const size = Math.min(remaining, block.length); writeSync(2, block, 0, size); remaining -= size;
    }
    process.exit(0);
  `,
      { mode: 0o755 },
    )
    const result = row(name, { DUPLICATION_TEST_PADDING_BYTES: String(paddingMiB * 1024 * 1024) })
    expect(result.status, result.output).toBe(expected)
    const records = readdirSync(result.evidence)
      .filter((file) => file.endsWith('-execution.json'))
      .map((file) => JSON.parse(readFileSync(join(result.evidence, file), 'utf8')))
    expect(records.length).toBe(paddingMiB > 64 ? 1 : 2)
    for (const record of records) {
      expect(record.groupTerminated).toBe(true)
      expect(record.streamsDrained).toBe(true)
      expect(record.settlementMilliseconds).toBeLessThanOrEqual(2000)
    }
    if (expected === 0) {
      expect(records.every((record) => record.state === 'complete' && record.status === 0)).toBe(
        true,
      )
      expect(records.reduce((sum, record) => sum + record.outputBytes, 0)).toBeLessThan(
        64 * 1024 * 1024,
      )
    } else {
      expect(result.output).toContain('64 MiB output budget')
      expect(
        records.some(
          (record) => record.state === 'failed' && record.rowOutputBytes > 64 * 1024 * 1024,
        ),
      ).toBe(true)
    }
  },
  30000,
)
