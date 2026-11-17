import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time

root = Path.cwd()
output = Path(sys.argv[1]).resolve()
archive = Path(sys.argv[2]).resolve()
release = Path(sys.argv[3]).resolve()
output.mkdir(parents=True, exist_ok=True)
records = []
with tempfile.TemporaryDirectory(prefix='pr55-installer-') as temporary:
    temporary = Path(temporary)
    subprocess.run(['tar', '-xzf', str(archive), '-C', str(temporary), 'gitleaks'], check=True)
    good = temporary / 'gitleaks'
    metadata = json.loads(release.read_text())
    metadata_path = temporary / 'release.json'
    metadata_path.write_text(metadata if isinstance(metadata, str) else json.dumps(metadata))
    worker = temporary / 'worker.mjs'
    worker.write_text('''import { readFileSync, writeFileSync } from 'node:fs'
const marker = process.env.PROBE_MARKER
const bytes = readFileSync(process.env.PROBE_ARCHIVE)
globalThis.fetch = async (url) => {
  if (url.startsWith('https://api.github.com/'))
    return new Response(readFileSync(process.env.PROBE_RELEASE, 'utf8'))
  if (process.env.PROBE_MODE === 'download') {
    writeFileSync(marker, 'download body interrupted')
    await new Promise(() => setInterval(() => {}, 1000))
  }
  return new Response(bytes)
}
const { gitleaks } = await import(''' + json.dumps((root / 'scripts/quality/install-gitleaks.mjs').as_uri()) + ''')
console.log(await gitleaks())
''')
    shim = temporary / 'shim'
    shim.mkdir()
    tar = shim / 'tar'
    tar.write_text('''#!/usr/bin/python3
import os, pathlib, sys, time
args = sys.argv[1:]
destination = pathlib.Path(args[args.index('-C') + 1]) / 'gitleaks'
destination.write_bytes(pathlib.Path(os.environ['PROBE_GOOD']).read_bytes()[:97792])
destination.chmod(0o755)
pathlib.Path(os.environ['PROBE_MARKER']).write_text('extraction interrupted')
time.sleep(60)
''')
    tar.chmod(0o755)
    for mode in ['download', 'extraction', 'corrupt-cache', 'same-version-impostor']:
        sandbox = temporary / mode
        sandbox.mkdir()
        binary = sandbox / '.cache/gitleaks/8.30.1/gitleaks'
        marker = sandbox / 'marker'
        environment = dict(os.environ, PATH='/usr/bin:/bin', PROBE_MODE=mode,
                           PROBE_ARCHIVE=str(archive), PROBE_RELEASE=str(metadata_path),
                           PROBE_MARKER=str(marker), PROBE_GOOD=str(good))
        command = [shutil.which('node'), str(worker)]
        record = {'probe': mode}
        if mode in ['download', 'extraction']:
            if mode == 'extraction':
                environment['PATH'] = str(shim) + ':/usr/bin:/bin'
            with (output / (mode + '-interrupted.log')).open('w') as log:
                process = subprocess.Popen(command, cwd=sandbox, env=environment,
                                           stdout=log, stderr=log, start_new_session=True)
                deadline = time.monotonic() + 20
                while not marker.exists() and process.poll() is None and time.monotonic() < deadline:
                    time.sleep(0.01)
                if not marker.exists():
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                    raise RuntimeError('Probe did not reach ' + mode)
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
            record['publishedBytesAtKill'] = binary.stat().st_size if binary.exists() else 0
        else:
            binary.parent.mkdir(parents=True)
            if mode == 'corrupt-cache':
                binary.write_bytes(good.read_bytes()[:97792])
            else:
                binary.write_text('#!/bin/sh\ntouch ' + str(marker) + '\necho 8.30.1\n')
            binary.chmod(0o755)
        environment.update(PATH='/usr/bin:/bin', PROBE_MODE='normal')
        with (output / (mode + '-retry.log')).open('w') as log:
            retry = subprocess.run(command, cwd=sandbox, env=environment, stdout=log, stderr=log, timeout=30)
        record['retryExit'] = retry.returncode
        record['publishedMatchesOfficialBinary'] = binary.exists() and binary.read_bytes() == good.read_bytes()
        if mode == 'same-version-impostor':
            record['impostorExecuted'] = marker.exists()
        record['passed'] = (record.get('publishedBytesAtKill', 0) == 0 and retry.returncode == 0
                            and record['publishedMatchesOfficialBinary'] and not record.get('impostorExecuted', False))
        records.append(record)
(output / 'installer-probes.json').write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps(records, indent=2))
if not all(record['passed'] for record in records):
    sys.exit(1)
