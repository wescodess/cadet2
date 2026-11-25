"""Remove local credentials and serialized session state from retained evidence."""
import json, pathlib, re, zipfile, os, urllib.parse, time

runtimes = [pathlib.Path(p).resolve() for p in os.environ.get('QA_RUNTIME_DIRS', os.environ.get('QA_RUNTIME_DIR', '')).split(os.pathsep) if p]
if not runtimes:
    raise ValueError('Set QA_RUNTIME_DIRS or QA_RUNTIME_DIR')
scratch = runtimes[0]
evidence = pathlib.Path(os.environ['QA_EVIDENCE']).resolve()
if any(p == evidence or evidence in p.parents for p in runtimes):
    raise ValueError('Credential scratch must be outside retained evidence')
values = set()
for file in [file for runtime in runtimes for file in runtime.glob('*accounts.json')]:
    for group in json.loads(file.read_text()).values():
        for account in group.values():
            values.update(x for x in [account.get('password'), account.get('token')] if x)
            values.update(c['value'] for c in account.get('cookies', []) if c.get('value'))
for file in [file for runtime in runtimes for file in runtime.glob('*runtime-secret')]:
    values.add(file.read_text().strip())
for runtime in runtimes:
    config = runtime / '.convex/local/default/config.json'
    if config.exists():
        data = json.loads(config.read_text())
        values.update(data[k] for k in ['adminKey', 'instanceSecret'] if data.get(k))
sensitive = {'password', 'token', 'accesstoken', 'refreshtoken', 'idtoken',
             'authorization', 'cookie', 'setcookie', 'adminkey', 'instancesecret',
             'sessiontoken', 'sessiondata'}
replacement = '[REDACTED_LOCAL_QA_CREDENTIAL]'
jwt = re.compile(r'\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\b')

def text(value):
    if secret_pattern is not None:
        value = secret_pattern.sub(replacement, value)
    return jwt.sub(replacement, value)

def credential_name(value):
    name = re.sub(r'[^a-z0-9]', '', str(value).lower())
    return name in sensitive or name.endswith(('sessiontoken', 'sessiondata', 'session'))

def add_cookie(value):
    for candidate in [value, urllib.parse.unquote(value)]:
        if len(candidate) >= 8:
            values.add(candidate)
        parts = candidate.split('.')
        if len(parts) == 2 and re.fullmatch(r'[A-Za-z0-9_-]{8,}', parts[0]):
            values.add(parts[0])

for runtime in runtimes:
    for file in runtime.glob('*accounts.json'):
        for group in json.loads(file.read_text()).values():
            for account in group.values():
                for cookie in account.get('cookies', []):
                    add_cookie(cookie['value'])

def collect_cookies(value):
    if isinstance(value, list):
        for item in value:
            collect_cookies(item)
    elif isinstance(value, dict):
        name = re.sub(r'[^a-z0-9]', '', str(value.get('name', '')).lower())
        raw = value.get('value')
        if isinstance(raw, str) and name in {'cookie', 'setcookie'}:
            for part in raw.split(';'):
                if '=' in part:
                    key, candidate = part.strip().split('=', 1)
                    if key.lower() not in {'path', 'domain', 'expires', 'max-age', 'samesite'}:
                        add_cookie(candidate)
        for item in value.values():
            collect_cookies(item)
    elif isinstance(value, str) and value.lstrip().startswith(('{', '[')):
        try:
            collect_cookies(json.loads(value))
        except (ValueError, RecursionError):
            pass

def inspect_bytes(raw):
    try:
        value = raw.decode('utf-8')
    except UnicodeDecodeError:
        return
    for line in value.splitlines():
        try:
            collect_cookies(json.loads(line))
        except (ValueError, RecursionError):
            pass

for file in evidence.rglob('*'):
    if not file.is_file():
        continue
    if file.suffix == '.zip':
        with zipfile.ZipFile(file) as archive:
            for name in archive.namelist():
                if not name.endswith(('.png', '.jpg', '.jpeg', '.webm', '.woff2')):
                    inspect_bytes(archive.read(name))
    elif file.suffix in {'.json', '.jsonl', '.log', '.md', '.txt', '.html', '.tap'}:
        inspect_bytes(file.read_bytes())

secrets_to_replace = sorted((value for value in values if len(value) >= 8), key=len, reverse=True)
secret_pattern = re.compile('|'.join(re.escape(value) for value in secrets_to_replace)) if secrets_to_replace else None

def nuxt_array(value):
    if not isinstance(value, list) or not value:
        return False
    root = value[0]
    if isinstance(root, list) and len(root) == 2 and isinstance(root[0], str) and root[0] in {'Reactive', 'ShallowReactive'}:
        ref = root[1]
        if not isinstance(ref, int) or ref < 0 or ref >= len(value):
            return False
        root = value[ref]
    return isinstance(root, dict) and 'state' in root

def redact_nuxt(value):
    # Session fields reference flattened array entries rather than containing their values.
    visited = set()
    def redact_ref(index):
        if isinstance(index, bool) or not isinstance(index, int) or index < 0 or index >= len(value) or index in visited:
            return
        visited.add(index)
        item = value[index]
        if isinstance(item, str):
            value[index] = replacement
        elif isinstance(item, dict):
            for ref in item.values():
                redact_ref(ref)
        elif isinstance(item, list):
            for offset, ref in enumerate(item):
                if isinstance(ref, int):
                    redact_ref(ref)
                elif isinstance(ref, str) and offset:
                    item[offset] = replacement
    for item in value:
        if isinstance(item, dict):
            for key, ref in item.items():
                if credential_name(key):
                    redact_ref(ref)
    return strings_only(value)

def strings_only(value):
    if isinstance(value, dict):
        return {key: strings_only(item) for key, item in value.items()}
    if isinstance(value, list):
        return [strings_only(item) for item in value]
    return text(value) if isinstance(value, str) else value

def html(value):
    if '__NUXT_DATA__' not in value:
        return value
    def script(match):
        if '__NUXT_DATA__' not in match.group(1):
            return match.group(0)
        try:
            payload = json.loads(match.group(2))
            if not nuxt_array(payload):
                return match.group(0)
            return '<script' + match.group(1) + '>' + json.dumps(redact_nuxt(payload), ensure_ascii=False) + '</script>'
        except ValueError:
            return match.group(0)
    return re.sub(r'<script([^>]*)>(.*?)</script>', script, value, flags=re.S)

def clean(value, cookie_values=False):
    if nuxt_array(value):
        return redact_nuxt(value)
    if isinstance(value, list):
        return [clean(x, cookie_values) for x in value]
    if isinstance(value, dict):
        secret_pair = credential_name(value.get('name', ''))
        return {k: replacement if v is not None and (credential_name(k) or (k == 'value' and (secret_pair or cookie_values)))
                else clean(v, k.lower() == 'cookies')
                for k, v in value.items()}
    if isinstance(value, str):
        value = html(text(value))
        if value.lstrip().startswith(('{', '[')):
            try:
                return json.dumps(clean(json.loads(value), cookie_values), ensure_ascii=False)
            except (ValueError, RecursionError):
                pass
        return value
    return value

def clean_bytes(raw):
    try:
        value = raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw
    value = html(value)
    try:
        return (json.dumps(clean(json.loads(value)), ensure_ascii=False, indent=2) + '\n').encode()
    except ValueError:
        lines = value.splitlines(keepends=True)
        result = []
        for line in lines:
            try:
                result.append(json.dumps(clean(json.loads(line)), ensure_ascii=False) + '\n')
            except ValueError:
                result.append(text(line))
        return ''.join(result).encode()

archives = files = 0
for file in evidence.rglob('*'):
    if not file.is_file():
        continue
    if file.suffix == '.zip':
        while os.getloadavg()[0] > 15:
            print(f'Holding evidence processing: load1={os.getloadavg()[0]:.2f}', flush=True)
            time.sleep(60)
        temporary = scratch / 'sanitized-trace.zip'
        with zipfile.ZipFile(file) as source, zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                raw = source.read(item.filename)
                target.writestr(item, clean_bytes(raw) if not item.filename.endswith(('.png', '.jpg', '.jpeg', '.webm', '.woff2')) else raw)
        os.replace(temporary, file)
        archives += 1
        if archives % 10 == 0:
            print(f'Processed {archives} trace archives', flush=True)
    elif file.suffix in {'.json', '.jsonl', '.log', '.md', '.txt', '.html', '.tap'}:
        old = file.read_bytes()
        new = clean_bytes(old)
        if old != new:
            file.write_bytes(new)
            files += 1
(evidence / 'sanitization.json').write_text(json.dumps({
    'traceArchivesProcessed': archives, 'textFilesUpdated': files,
    'policy': 'Local password, signed/raw cookie, authorization, JWT, operator secrets and Nuxt session references removed. Binary screenshots/video are unchanged. Trace timing, steps, statuses and resource references are retained.'
}, indent=2))
print(f'Sanitized {archives} trace archives and {files} text files')
