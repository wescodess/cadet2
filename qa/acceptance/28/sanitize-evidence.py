"""Remove ephemeral local credentials from this retry's text and trace artifacts."""
import json, pathlib, re, zipfile, os

clone = pathlib.Path('/tmp/qa-28b')
evidence = pathlib.Path('/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2')
values = set()
for file in (clone / '.scratch').glob('*accounts.json'):
    for group in json.loads(file.read_text()).values():
        for account in group.values():
            values.update(x for x in [account.get('password'), account.get('token')] if x)
            values.update(c['value'] for c in account.get('cookies', []) if c.get('value'))
for file in (clone / '.scratch').glob('*runtime-secret'):
    values.add(file.read_text().strip())
config = clone / '.artifacts/candidate/.convex/local/default/config.json'
if config.exists():
    data = json.loads(config.read_text())
    values.update(data[k] for k in ['adminKey', 'instanceSecret'] if data.get(k))
sensitive = {'password', 'token', 'accesstoken', 'refreshtoken', 'idtoken',
             'authorization', 'cookie', 'set-cookie', 'adminkey', 'instancesecret'}
replacement = '[REDACTED_LOCAL_QA_CREDENTIAL]'
jwt = re.compile(r'\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\b')

def text(value):
    for secret in values:
        if len(secret) >= 8:
            value = value.replace(secret, replacement)
    return jwt.sub(replacement, value)

def clean(value):
    if isinstance(value, list):
        return [clean(x) for x in value]
    if isinstance(value, dict):
        if str(value.get('name', '')).lower() in sensitive and 'value' in value:
            return {k: replacement if k == 'value' else clean(v) for k, v in value.items()}
        return {k: replacement if k.lower().replace('_', '') in sensitive else clean(v)
                for k, v in value.items()}
    if isinstance(value, str):
        value = text(value)
        if value.lstrip().startswith(('{', '[')):
            try:
                return json.dumps(clean(json.loads(value)), ensure_ascii=False)
            except (ValueError, RecursionError):
                pass
        return value
    return value

def clean_bytes(raw):
    try:
        value = raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw
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
        # Scratch stays in the owned clone, never beside retained evidence.
        temporary = clone / '.scratch' / 'sanitized-trace.zip'
        with zipfile.ZipFile(file) as source, zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                raw = source.read(item.filename)
                target.writestr(item, clean_bytes(raw) if not item.filename.endswith(('.png', '.jpg', '.jpeg', '.webm', '.woff2')) else raw)
        os.replace(temporary, file)
        archives += 1
    elif file.suffix in {'.json', '.log', '.md', '.txt', '.html'}:
        old = file.read_bytes()
        new = clean_bytes(old)
        if old != new:
            file.write_bytes(new)
            files += 1
(evidence / 'sanitization.json').write_text(json.dumps({
    'traceArchivesProcessed': archives, 'textFilesUpdated': files,
    'policy': 'Local password, cookie, authorization, JWT and operator secrets removed. Binary screenshots/video and previous-session evidence are unchanged. Trace timing, steps, statuses and resource references are retained.'
}, indent=2))
print(f'Sanitized {archives} trace archives and {files} text files')
