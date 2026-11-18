import json
from pathlib import Path
import subprocess
import sys

out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
fixture = Path('tests/unit/review-skip-options.spec.ts')
cases = json.loads(Path('tests/unit/quality-policy/cases.json').read_text())
results = []
try:
    for case in cases:
        fixture.write_text("import { test, describe } from 'vitest'\n" + case['source'] + '\n')
        result = subprocess.run(['pnpm', 'test:policy'], text=True, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=120)
        name = case['name'].replace(' ', '-').replace('.', '-')
        (out / (name + '-policy-after.txt')).write_text(result.stdout)
        results.append(dict(probe=case['name'], exit=result.returncode,
                            rejected=result.returncode == 1))
finally:
    fixture.unlink(missing_ok=True)
(out / 'policy-after.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
if not all(result['rejected'] for result in results):
    sys.exit(1)
