"""Remove ephemeral local credentials from this retry's text and trace artifacts."""
import json, pathlib, re, zipfile, os

scratch = pathlib.Path(os.environ['QA_RUNTIME_DIR']).resolve()
evidence = pathlib.Path(os.environ['QA_EVIDENCE']).resolve()
if scratch == evidence or evidence in scratch.parents:
    raise ValueError('Credential scratch must be outside retained evidence')
values = set()
for file in scratch.glob('*accounts.json'):
    for group in json.loads(file.read_text()).values():
        for account in group.values():
            values.update(x for x in [account.get('password'), account.get('token')] if x)
            values.update(c['value'] for c in account.get('cookies', []) if c.get('value'))
for file in scratch.glob('*runtime-secret'):
    values.add(file.read_text().strip())
config = scratch / '.convex/local/default/config.json'
if config.exists():
    data = json.loads(config.read_text())
    values.update(data[k] for k in ['adminKey', 'instanceSecret'] if data.get(k))
sensitive = {'password', 'token', 'accesstoken', 'refreshtoken', 'idtoken',
             'authorization', 'cookie', 'setcookie', 'adminkey', 'instancesecret',
             'sessiontoken', 'sessiondata'}
replacement = '[REDACTED_LOCAL_QA_CREDENTIAL]'
jwt = re.compile(r'\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\b')

def text(value):
    for secret in values:
        if len(secret) >= 8:
            value = value.replace(secret, replacement)
    return jwt.sub(replacement, value)

def credential_name(value):
    name = re.sub(r'[^a-z0-9]', '', str(value).lower())
    return name in sensitive or name.endswith(('sessiontoken', 'sessiondata'))

def clean(value, cookie_values=False):
    if isinstance(value, list):
        return [clean(x, cookie_values) for x in value]
    if isinstance(value, dict):
        secret_pair = credential_name(value.get('name', ''))
        return {k: replacement if credential_name(k) or (k == 'value' and (secret_pair or cookie_values))
                else clean(v, k.lower() == 'cookies')
                for k, v in value.items()}
    if isinstance(value, str):
        value = text(value)
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
        temporary = scratch / 'sanitized-trace.zip'
        with zipfile.ZipFile(file) as source, zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                raw = source.read(item.filename)
                target.writestr(item, clean_bytes(raw) if not item.filename.endswith(('.png', '.jpg', '.jpeg', '.webm', '.woff2')) else raw)
        os.replace(temporary, file)
        archives += 1
    elif file.suffix in {'.json', '.log', '.md', '.txt', '.html', '.tap'}:
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
