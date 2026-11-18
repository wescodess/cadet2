// @vitest-environment node
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pins = {
  'darwin-arm64': [
    'darwin_arm64',
    'b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5',
    'ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f',
  ],
  'linux-x64': [
    'linux_x64',
    '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb',
    '88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509',
  ],
}
let root, cache, pin, run, fetcher, metadata, response, binary, platform, arch
beforeEach(() => {
  vi.resetModules()
  root = mkdtempSync(path.join(tmpdir(), 'quality-cache-'))
  cache = path.join(root, 'cache')
  pin = pins[`${process.platform}-${process.arch}`]
  platform = process.platform
  arch = process.arch
  binary = 'binary'
  const name = `gitleaks_8.30.1_${pin[0]}.tar.gz`
  metadata = JSON.parse(
    JSON.parse(
      readFileSync(new URL('./quality-parsers/gitleaks-release.json', import.meta.url), 'utf8'),
    ).valid,
  )
  metadata.assets[0] = {
    ...metadata.assets[0],
    name,
    browser_download_url: `https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/${name}`,
    digest: `sha256:${pin[1]}`,
  }
  response = 'archive'
  fetcher = vi.fn(async (url) =>
    url.includes('api.github.com')
      ? { ok: true, text: async () => JSON.stringify(metadata) }
      : { ok: true, arrayBuffer: async () => Buffer.from(response) },
  )
  vi.stubGlobal('fetch', fetcher)
  vi.doMock('node:path', () => ({
    ...path,
    resolve: (...args) => {
      expect(args).toEqual(['.cache', 'gitleaks'])
      return cache
    },
  }))
  vi.doMock('node:crypto', () => ({
    createHash: (algorithm) => {
      expect(algorithm).toBe('sha256')
      return {
        update: (value) => ({
          digest: (encoding) => {
            expect(encoding).toBe('hex')
            return value.toString() === 'archive'
              ? pin[1]
              : value.toString() === 'binary'
                ? pin[2]
                : createHash(algorithm).update(value).digest(encoding)
          },
        }),
      }
    },
  }))
  run = vi.fn((command, args) => {
    if (command === 'tar') {
      writeFileSync(path.join(args[3], 'gitleaks'), binary)
      return { status: 0, stdout: '', stderr: '' }
    }
    return { status: 0, stdout: '8.30.1\n', stderr: '' }
  })
  vi.doMock('../../scripts/quality/common.mjs', () => ({ outputDir: root, run }))
})
afterEach(() => {
  Object.defineProperty(process, 'platform', { value: platform })
  Object.defineProperty(process, 'arch', { value: arch })
  vi.doUnmock('node:fs')
  for (const name of ['node:path', 'node:crypto', '../../scripts/quality/common.mjs'])
    vi.doUnmock(name)
  vi.unstubAllGlobals()
  rmSync(root, { recursive: true, force: true })
})
async function install() {
  return (await import('../../scripts/quality/install-gitleaks.mjs')).gitleaks()
}
function cached(contents) {
  mkdirSync(cache, { recursive: true })
  writeFileSync(path.join(cache, `${pin[1]}.tar.gz`), contents)
}

describe('verified gitleaks cache', () => {
  it.each(['darwin-arm64', 'linux-x64'])(
    'downloads and validates the exact pinned %s release',
    async (target) => {
      pin = pins[target]
      const [os, cpu] = target.split('-')
      Object.defineProperty(process, 'platform', { value: os })
      Object.defineProperty(process, 'arch', { value: cpu })
      const name = `gitleaks_8.30.1_${pin[0]}.tar.gz`
      metadata.assets[0] = {
        ...metadata.assets[0],
        name,
        browser_download_url: `https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/${name}`,
        digest: `sha256:${pin[1]}`,
      }
      const result = await install()
      expect(readFileSync(result, 'utf8')).toBe('binary')
      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(fetcher.mock.calls[1][0]).toBe(metadata.assets[0].browser_download_url)
      expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
      expect(fetcher.mock.calls[1][1].signal).toBe(fetcher.mock.calls[0][1].signal)
      expect(readFileSync(path.join(cache, `${pin[1]}.tar.gz`), 'utf8')).toBe('archive')
      expect(run.mock.calls[0][1]).toEqual([
        '-xzf',
        path.join(cache, `${pin[1]}.tar.gz`),
        '-C',
        path.dirname(result),
        'gitleaks',
      ])
      expect(run.mock.calls[1]).toEqual([result, ['version']])
      expect(readdirSync(cache)).toEqual([`${pin[1]}.tar.gz`])
    },
  )
  it('reuses a verified archive offline and extracts a fresh binary each time', async () => {
    cached('archive')
    const first = await install()
    const second = await install()
    expect(first).not.toBe(second)
    expect(fetcher).not.toHaveBeenCalled()
    expect(run).toHaveBeenCalledTimes(4)
  })
  it('replaces corrupt cache entries only after checksum validation', async () => {
    cached('corrupt')
    await install()
    expect(readFileSync(path.join(cache, `${pin[1]}.tar.gz`), 'utf8')).toBe('archive')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('rejects corrupt downloads without replacing the prior cache entry', async () => {
    cached('corrupt')
    response = 'bad download'
    await expect(install()).rejects.toThrow(/checksum mismatch/)
    expect(readFileSync(path.join(cache, `${pin[1]}.tar.gz`), 'utf8')).toBe('corrupt')
    expect(readdirSync(cache)).toEqual([`${pin[1]}.tar.gz`])
  })
  it.each(['missing', 'url', 'digest'])('rejects release asset mismatch: %s', async (kind) => {
    if (kind === 'missing') {
      metadata.assets[0].name = 'unrelated.tar.gz'
      metadata.assets[0].browser_download_url =
        'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/unrelated.tar.gz'
    } else if (kind === 'url')
      metadata.assets[0].browser_download_url = 'https://example.com/archive'
    else metadata.assets[0].digest = 'sha256:' + '0'.repeat(64)
    await expect(install()).rejects.toThrow(/match/)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(readdirSync(cache)).toEqual([])
  })
  it.each(['metadata', 'download'])('rejects failed %s HTTP response', async (stage) => {
    fetcher.mockImplementation(async (url) =>
      stage === 'metadata' || !url.includes('api.github.com')
        ? { ok: false, status: 503 }
        : { ok: true, text: async () => JSON.stringify(metadata) },
    )
    await expect(install()).rejects.toThrow(/failed: 503/)
    expect(readdirSync(cache)).toEqual([])
  })
  it('rejects failed extraction', async () => {
    cached('archive')
    run.mockReturnValue({ status: 1, stdout: '', stderr: 'invalid archive' })
    await expect(install()).rejects.toThrow(/invalid archive/)
  })
  it('rejects a changed extracted binary', async () => {
    cached('archive')
    binary = 'tampered binary'
    await expect(install()).rejects.toThrow(/binary checksum mismatch/)
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('rejects an unexpected executable version', async () => {
    cached('archive')
    run
      .mockImplementationOnce((command, args) => {
        writeFileSync(path.join(args[3], 'gitleaks'), 'binary')
        return { status: 0 }
      })
      .mockReturnValue({ status: 0, stdout: '8.30.2\n', stderr: '' })
    await expect(install()).rejects.toThrow(/Unexpected gitleaks version/)
  })
  it('rejects unsupported platforms before any download', async () => {
    Object.defineProperty(process, 'platform', { value: 'unsupported' })
    await expect(install()).rejects.toThrow(/Unsupported gitleaks platform/)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('propagates cache IO errors rather than treating them as cache misses', async () => {
    mkdirSync(path.join(cache, `${pin[1]}.tar.gz`), { recursive: true })
    await expect(install()).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
    expect(existsSync(cache)).toBe(true)
  })
})

describe('concurrent cache publication', () => {
  it('does not replace a cache entry published and verified by a concurrent downloader', async () => {
    const rename = vi.fn()
    vi.doMock('node:fs', async (original) => ({ ...(await original()), renameSync: rename }))
    fetcher.mockImplementation(async (url) =>
      url.includes('api.github.com')
        ? { ok: true, text: async () => JSON.stringify(metadata) }
        : {
            ok: true,
            arrayBuffer: async () => {
              cached('archive')
              return Buffer.from('archive')
            },
          },
    )
    await install()
    expect(rename).not.toHaveBeenCalled()
  })
})

describe('release asset selection', () => {
  it('selects the pinned platform archive after an unrelated release asset', async () => {
    const unrelated = {
      ...metadata.assets[0],
      id: metadata.assets[0].id + 1,
      url: metadata.assets[0].url.replace(/\d+$/, String(metadata.assets[0].id + 1)),
      name: 'unrelated.tar.gz',
      browser_download_url:
        'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/unrelated.tar.gz',
    }
    metadata.assets.unshift(unrelated)
    await install()
    expect(fetcher.mock.calls[1][0]).toBe(metadata.assets[1].browser_download_url)
  })
})

describe('idempotent download cleanup', () => {
  it('accepts a verified publication whose private download directory was already removed', async () => {
    vi.doMock('node:fs', async (original) => {
      const fs = await original()
      return {
        ...fs,
        renameSync: (from, to) => {
          fs.renameSync(from, to)
          fs.rmSync(path.dirname(from), { recursive: true, force: true })
        },
      }
    })
    await expect(install()).resolves.toEqual(expect.any(String))
    expect(readFileSync(path.join(cache, `${pin[1]}.tar.gz`), 'utf8')).toBe('archive')
  })
})
