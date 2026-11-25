import os
import subprocess
import sys
import time

wrapper = '/Users/wesleyukadike/.orchestrate/scripts/cadet2-run'
for attempt in range(61):
    result = subprocess.run([wrapper, '--lease', 'qa-74', *sys.argv[1:]], capture_output=True, text=True)
    print(result.stdout, end='', flush=True)
    print(result.stderr, end='', file=sys.stderr, flush=True)
    if result.returncode == 0:
        sys.exit(0)
    if 'is held' not in result.stderr and 'load1' not in result.stderr:
        sys.exit(result.returncode)
    if attempt == 60:
        sys.exit(result.returncode)
    print(f'Browser lease retry {attempt + 1}/60 in one minute; load1={os.getloadavg()[0]:.2f}', flush=True)
    time.sleep(60)
