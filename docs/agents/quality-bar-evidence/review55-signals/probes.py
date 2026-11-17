import errno, json, os, pathlib, pty, select, shutil, signal, subprocess, sys, time

ROOT = pathlib.Path(os.environ.get('PROBE_ROOT', '/tmp/fix-pr55-sig')).resolve()
OUT = pathlib.Path(sys.argv[1]).resolve()
REAL_ROWS = '--real-rows' in sys.argv
OUT.mkdir(parents=True, exist_ok=True)
SHIMS = OUT / 'shims'
SHIMS.mkdir(exist_ok=True)
PNPM = shutil.which('pnpm')
(SHIMS / 'pnpm').write_text('''#!/usr/bin/env python3
import json, os, pathlib, signal, subprocess, sys, time
row = sys.argv[-1]
print('probe row:', row, flush=True)
if row == os.environ.get('PROBE_HANG_ROW', 'lint'):
    descendant = subprocess.Popen([sys.executable, '-c', 'import signal,time; [signal.signal(s,signal.SIG_IGN) for s in [signal.SIGINT,signal.SIGTERM,signal.SIGHUP]]; print("descendant ready",flush=True); time.sleep(300)'])
    pathlib.Path(os.environ['PROBE_READY']).write_text(json.dumps({'row_pid': os.getpid(), 'descendant_pid': descendant.pid}))
    time.sleep(300)
sys.exit(1 if row == os.environ.get('PROBE_FAIL_ROW') else 0)
''')
(SHIMS / 'pnpm').chmod(0o755)

def alive(pid):
    try:
        os.kill(pid, 0)
        state = subprocess.check_output(['ps', '-o', 'stat=', '-p', str(pid)], text=True).strip()
        return bool(state) and not state.startswith('Z')
    except (ProcessLookupError, subprocess.CalledProcessError):
        return False

def run(label, sig, target, terminal=False):
    ready = OUT / (label + '.ready.json')
    env = dict(os.environ, PATH=(os.environ['PATH'] if REAL_ROWS else str(SHIMS) + ':' + os.environ['PATH']), PROBE_READY=str(ready))
    env.pop('QUALITY_OUTPUT_DIR', None)
    command = [PNPM, 'verify'] if target != 'gate' else ['node', 'scripts/quality/verify.mjs']
    if terminal:
        pid, fd = pty.fork()
        if pid == 0:
            os.chdir(ROOT)
            os.execve(command[0], command, env)
        os.set_blocking(fd, False)
        output = bytearray()
        def drain():
            try:
                while True:
                    chunk = os.read(fd, 65536)
                    if not chunk: break
                    output.extend(chunk)
            except OSError as error:
                if error.errno not in (errno.EAGAIN, errno.EIO): raise
    else:
        log = open(OUT / (label + '.txt'), 'w')
        proc = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        pid = proc.pid
        def drain(): pass
    deadline = time.monotonic() + 20
    while not ready.exists() and time.monotonic() < deadline:
        drain()
        time.sleep(.05)
    assert ready.exists(), label
    pids = json.loads(ready.read_text())
    time.sleep(.2)
    if terminal:
        os.write(fd, b'\x03')
    elif target == 'group':
        os.killpg(pid, sig)
    elif target == 'row':
        os.kill(pids['row_pid'], sig)
    else:
        os.kill(pid, sig)
    deadline = time.monotonic() + 8
    code = None
    while time.monotonic() < deadline:
        drain()
        if terminal:
            waited, status = os.waitpid(pid, os.WNOHANG)
            if waited:
                code = os.waitstatus_to_exitcode(status)
                break
        else:
            code = proc.poll()
            if code is not None: break
        time.sleep(.05)
    time.sleep(.3)
    drain()
    if terminal:
        content = output.decode(errors='replace')
        (OUT / (label + '.txt')).write_text(content)
        os.close(fd)
    else:
        log.close()
        content = (OUT / (label + '.txt')).read_text()
    directory = next(line.split(': ', 1)[1].strip() for line in content.splitlines() if line.startswith('Quality evidence: '))
    manifest_path = ROOT / directory / 'verification.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else None
    remaining = {name: alive(value) for name, value in pids.items()}
    for value in pids.values():
        try: os.kill(value, signal.SIGKILL)
        except ProcessLookupError: pass
    try: os.killpg(pid, signal.SIGKILL)
    except ProcessLookupError: pass
    if not terminal: proc.wait(timeout=5)
    result = {'signal': sig.name, 'target': target, 'terminal_ctrl_c': terminal, 'exit': code, 'shell_exit': 128-code if code is not None and code < 0 else code, 'manifest': manifest, 'surviving_processes': remaining, 'directory': directory}
    if isinstance(manifest, dict):
        assert code is not None and code != 0, result
        assert manifest['status'] == 'aborted' and manifest['signal'] == sig.name, result
        assert len(manifest['rows']) == 8, result
        assert [row['status'] for row in manifest['rows']] == ['pass', 'interrupted'] + ['not_run'] * 6, result
        assert not any(remaining.values()), result
    (OUT / (label + '.json')).write_text(json.dumps(result, indent=2) + '\n')
    return result

results = {}
original_package = (ROOT / 'package.json').read_bytes()
if REAL_ROWS:
    package = json.loads(original_package)
    fixture = OUT / 'row.py'
    fixture.write_text((SHIMS / 'pnpm').read_text())
    for row in ['typecheck', 'lint', 'format:check', 'secrets:check', 'dependencies:check', 'test:policy', 'test:components', 'build']:
        package['scripts'][row] = f'{sys.executable} {fixture} {row}'
    (ROOT / 'package.json').write_text(json.dumps(package, indent=2) + '\n')
try:
    results['terminal-ctrl-c'] = run('terminal-ctrl-c', signal.SIGINT, 'group', terminal=True)
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        for target in ('group', 'parent', 'gate', 'row'):
            label = sig.name + '-' + target
            results[label] = run(label, sig, target)
    (OUT / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps({label: {'exit': value['exit'], 'status': value['manifest'].get('status') if isinstance(value['manifest'], dict) else 'partial-array', 'survivors': value['surviving_processes']} for label, value in results.items()}, indent=2))
finally:
    if REAL_ROWS: (ROOT / 'package.json').write_bytes(original_package)
