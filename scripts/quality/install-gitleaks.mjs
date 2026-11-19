import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse as parseVersion } from './gitleaks-version.parser.mjs'
import { parse as parseRelease } from './gitleaks-release.parser.mjs'
import { run } from './common.mjs'

export const version = '8.30.1'
const archives = {
  'linux-x64': [
    'linux_x64',
    '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb',
    '88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509',
  ],
  'darwin-arm64': [
    'darwin_arm64',
    'b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5',
    'ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f',
  ],
}

function installedVersion(binary) {
  const result = run(binary, ['version'])
  return parseVersion({
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  }).stdout.trim()
}

function verifyBinary(binary, checksum) {
  if (createHash('sha256').update(readFileSync(binary)).digest('hex') !== checksum)
    throw new Error('gitleaks binary checksum mismatch')
  if (installedVersion(binary) !== version) throw new Error('Unexpected gitleaks version')
}

function verifiedArchive(path, checksum) {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex') === checksum
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return false
  }
}

async function transport(request) {
  try {
    return await request()
  } catch {
    throw new Error('gitleaks transport failed')
  }
}

async function downloadArchive(archive, destination) {
  const directory = mkdtempSync(join(resolve('.cache', 'gitleaks'), '.download-'))
  try {
    const name = `gitleaks_${version}_${archive[0]}.tar.gz`
    const signal = AbortSignal.timeout(60_000)
    const token = process.env.GITHUB_TOKEN
    if (token && /[^\x21-\x7e]/.test(token)) throw new Error('Invalid GITHUB_TOKEN characters')
    const metadata = await transport(() =>
      fetch(`https://api.github.com/repos/gitleaks/gitleaks/releases/tags/v${version}`, {
        signal,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      }),
    )
    if (!metadata.ok) throw new Error(`gitleaks release metadata failed: ${metadata.status}`)
    const release = parseRelease(await transport(() => metadata.text()))
    const url = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${name}`
    const asset = release.assets.find((entry) => entry.name === name)
    if (!asset || asset.browser_download_url !== url || asset.digest !== `sha256:${archive[1]}`)
      throw new Error('gitleaks release asset does not match pinned archive')
    const response = await transport(() => fetch(url, { signal }))
    if (!response.ok) throw new Error(`gitleaks download failed: ${response.status}`)
    const temporary = join(directory, name)
    writeFileSync(temporary, Buffer.from(await transport(() => response.arrayBuffer())))
    if (!verifiedArchive(temporary, archive[1])) throw new Error('gitleaks checksum mismatch')
    if (!verifiedArchive(destination, archive[1])) renameSync(temporary, destination)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

export async function gitleaks(parent) {
  const archive = archives[`${process.platform}-${process.arch}`]
  if (!archive)
    throw new Error(`Unsupported gitleaks platform: ${process.platform}-${process.arch}`)
  const cache = resolve('.cache', 'gitleaks')
  mkdirSync(cache, { recursive: true })
  const archivePath = join(cache, `${archive[1]}.tar.gz`)
  if (!verifiedArchive(archivePath, archive[1])) await downloadArchive(archive, archivePath)
  const directory = mkdtempSync(join(parent, 'gitleaks-'))
  const extract = run('tar', ['-xzf', archivePath, '-C', directory, 'gitleaks'])
  if (extract.status !== 0) throw new Error(extract.stderr)
  const binary = join(directory, 'gitleaks')
  verifyBinary(binary, archive[2])
  return binary
}
