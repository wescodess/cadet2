// @vitest-environment node
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
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

for (const kind of ['empty', 'partial', 'vue-empty']) {
  it(
    'rejects a valid ' + kind + ' clone report after native scanning and restores a native control',
    () => {
      const directory = mkdtempSync(join(tmpdir(), 'duplication-population-'))
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
      writeFileSync(
        join(directory, 'package.json'),
        '{"name":"population-fixture","type":"module"}',
      )
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
      writeFileSync(
        join(directory, 'scripts/quality/baselines/duplication.json'),
        JSON.stringify({
          date: '2026-11-21',
          commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
          counts: {},
        }),
      )
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
      const row = (name) => {
        const evidence = join(directory, 'evidence', name)
        mkdirSync(evidence, { recursive: true })
        const result = spawnSync(process.execPath, ['scripts/quality/duplication.mjs'], {
          cwd: directory,
          encoding: 'utf8',
          env: { ...process.env, QUALITY_BASE_REF: 'HEAD', QUALITY_OUTPUT_DIR: evidence },
        })
        console.info(
          JSON.stringify({
            kind,
            case: name,
            status: result.status,
            output: result.stdout + result.stderr,
          }),
        )
        return { status: result.status, output: result.stdout + result.stderr }
      }
      expect(row('native-unique').status).toBe(0)
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
      expect(row('restored-native').status).toBe(0)
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
