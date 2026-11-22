import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time

root = Path.cwd()
out = Path(sys.argv[1]).resolve()
archive = Path(sys.argv[2]).resolve()
release = Path(sys.argv[3]).resolve()
out.mkdir(parents=True, exist_ok=True)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
records = []
with tempfile.TemporaryDirectory(prefix='pr55-cache-') as sandbox:
    sandbox = Path(sandbox)
    worker = sandbox / 'worker.mjs'
    worker.write_text('''import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
const marker = (name) => `${process.cwd()}/${name}`
async function wait(name) {
  const deadline = Date.now() + 30000
  while (!fs.existsSync(marker(name))) {
    if (Date.now() > deadline) throw new Error(`Timeout: ${name}`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
const mode = process.argv[2]
const bytes = fs.readFileSync(process.env.PROBE_ARCHIVE)
globalThis.fetch = async (url) => {
  if (mode === 'stale') {
    fs.writeFileSync(marker('stale-ready'), '')
    await wait('published')
    fs.writeFileSync(marker('removed'), '')
    throw new Error('controlled offline retry after failed verification')
  }
  if (mode === 'offline') throw new Error('unexpected fetch on verified cache hit')
  if (url.startsWith('https://api.github.com/'))
    return new Response(fs.readFileSync(process.env.PROBE_RELEASE, 'utf8'))
  if (mode === 'interrupted') {
    fs.writeFileSync(marker('partial-download'), bytes.subarray(0, 97792))
    await new Promise(() => setInterval(() => {}, 1000))
  }
  return new Response(bytes)
}
const { gitleaks } = await import(process.env.PROBE_INSTALLER)
if (mode === 'publish') await wait('stale-ready')
try {
  const binary = await gitleaks()
  const before = spawnSync(binary, ['version'], { encoding: 'utf8' })
  if (mode === 'publish') {
    fs.writeFileSync(marker('published'), '')
    await wait('removed')
  }
  const after = spawnSync(binary, ['version'], { encoding: 'utf8' })
  console.log(JSON.stringify({ binary, before: before.status, after: after.status, version: after.stdout.trim() }))
  if (before.status !== 0 || after.status !== 0) process.exitCode = 1
} catch (error) {
  console.log(error.message)
  process.exitCode = mode === 'stale' ? 0 : 1
}
''')
    env = dict(os.environ, PROBE_ARCHIVE=str(archive), PROBE_RELEASE=str(release),
               PROBE_INSTALLER=(root / 'scripts/quality/install-gitleaks.mjs').as_uri())
    def start(mode, directory, log):
        return subprocess.Popen(['node', str(worker), mode], cwd=directory, env=env,
                                stdout=log, stderr=log, start_new_session=True)
    def invoke(mode, directory, name):
        with (out / (name + '.txt')).open('w') as log:
            p = start(mode, directory, log)
            code = p.wait(timeout=40)
        text = (out / (name + '.txt')).read_text()
        if code != 0:
            raise RuntimeError(text)
        return json.loads(text.strip().splitlines()[-1])

    race = sandbox / 'race'
    race.mkdir()
    with (out / 'race-stale-after.txt').open('w') as stale_log, (out / 'race-publish-after.txt').open('w') as publish_log:
        stale = start('stale', race, stale_log)
        publish = start('publish', race, publish_log)
        try:
            codes = [stale.wait(timeout=40), publish.wait(timeout=40)]
        finally:
            for p in [stale, publish]:
                if p.poll() is None:
                    os.killpg(p.pid, signal.SIGKILL)
                    p.wait()
    records.append(dict(probe='reviewer-race-interleaving', exits=codes,
                        passed=codes == [0, 0],
                        publisher=json.loads((out / 'race-publish-after.txt').read_text().strip())))

    interrupted = sandbox / 'interrupted'
    interrupted.mkdir()
    with (out / 'download-interrupted.txt').open('w') as log:
        p = start('interrupted', interrupted, log)
        deadline = time.monotonic() + 20
        while not (interrupted / 'partial-download').exists() and p.poll() is None and time.monotonic() < deadline:
            time.sleep(0.01)
        reached = (interrupted / 'partial-download').exists()
        os.killpg(p.pid, signal.SIGKILL)
        p.wait()
    cache = interrupted / '.cache/gitleaks' / (digest + '.tar.gz')
    published = cache.exists()
    retry = invoke('normal', interrupted, 'download-retry')
    records.append(dict(probe='interrupted-download', reachedBody=reached,
                        publishedAtKill=published, retry=retry,
                        passed=reached and not published and retry['after'] == 0))

    inode = cache.stat().st_ino
    mtime = cache.stat().st_mtime_ns
    second = invoke('offline', interrupted, 'verified-cache-offline')
    records.append(dict(probe='immutable-cache-private-binaries',
                        passed=cache.stat().st_ino == inode and cache.stat().st_mtime_ns == mtime and second['binary'] != retry['binary'],
                        first=retry['binary'], second=second['binary']))

    cache.write_bytes(b'corrupted archive')
    repaired = invoke('normal', interrupted, 'corrupt-cache-retry')
    # A second repair cannot remove or invalidate a prior run's private executable.
    previous = subprocess.run([retry['binary'], 'version'], cwd=interrupted, capture_output=True)
    records.append(dict(probe='corrupted-cache-entry',
                        passed=hashlib.sha256(cache.read_bytes()).hexdigest() == digest and previous.returncode == 0,
                        repaired=repaired, priorBinaryExit=previous.returncode))

(out / 'installer-after.json').write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps(records, indent=2))
if not all(record['passed'] for record in records):
    sys.exit(1)
