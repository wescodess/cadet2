import json, os, pathlib, subprocess, sys
root = pathlib.Path('/tmp/fix-pr55-sig')
out = pathlib.Path('/tmp/pr55-signal-evidence/controls')
out.mkdir(exist_ok=True)
original = (root / 'package.json').read_bytes()
package = json.loads(original)
rows = ['typecheck', 'lint', 'format:check', 'secrets:check', 'dependencies:check', 'test:policy', 'test:components', 'build']
fixture = out / 'row.py'
fixture.write_text('import os,sys\nprint(sys.argv[1])\nsys.exit(1 if sys.argv[1] == os.environ.get("PROBE_FAIL_ROW") else 0)\n')
for row in rows:
    package['scripts'][row] = f'{sys.executable} {fixture} {row}'
def start(label, fail=''):
    log = open(out / (label + '.txt'), 'w')
    env = dict(os.environ, PROBE_FAIL_ROW=fail)
    env.pop('QUALITY_OUTPUT_DIR', None)
    return subprocess.Popen(['pnpm', 'verify'], cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT), log
def finish(label, started):
    proc, log = started
    code = proc.wait(timeout=20)
    log.close()
    content = (out / (label + '.txt')).read_text()
    directory = next(line.split(': ', 1)[1] for line in content.splitlines() if line.startswith('Quality evidence: '))
    return {'exit': code, 'directory': directory, 'manifest': json.loads((root / directory / 'verification.json').read_text())}
try:
    (root / 'package.json').write_text(json.dumps(package, indent=2) + '\n')
    passing = start('pass')
    failing = start('fail', 'typecheck')
    results = {'pass': finish('pass', passing), 'fail': finish('fail', failing)}
    assert results['pass']['exit'] == 0 and results['pass']['manifest']['status'] == 'pass'
    assert [row['status'] for row in results['pass']['manifest']['rows']] == ['pass'] * 8
    assert results['fail']['exit'] == 1 and results['fail']['manifest']['status'] == 'fail'
    assert [row['status'] for row in results['fail']['manifest']['rows']] == ['fail'] + ['pass'] * 7
    assert results['pass']['directory'] != results['fail']['directory']
    (out / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
finally:
    (root / 'package.json').write_bytes(original)
print('PASS: success, failure aggregation, and distinct concurrent run directories')
