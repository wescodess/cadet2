import os, pathlib, subprocess, json, shutil
root=pathlib.Path('/tmp/fix-pr55-r2')
ev=pathlib.Path('/tmp/review-pr55-r2-evidence/fix-after')
node=shutil.which('node')
results=[]
def run(name,args,env=None,timeout=45):
    e=os.environ.copy(); e.update(env or {})
    try:
        p=subprocess.run(args,cwd=root,env=e,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
        code=p.returncode; out=p.stdout
    except subprocess.TimeoutExpired as p:
        code='TIMEOUT'; out=(p.stdout or b'').decode() if isinstance(p.stdout,bytes) else (p.stdout or '')
    (ev/(name+'.txt')).write_text(out)
    results.append({'probe':name,'command':args,'env':env or {},'exit':code})
    print(name, 'exit',code, out[-1800:],flush=True)
    return code
fake=ev/'fake-scanner'; fake.mkdir(exist_ok=True)
f=fake/'gitleaks'; f.write_text('#!/bin/sh\nif [ "$1" = version ]; then echo 8.30.1; exit 0; fi\necho "FATAL: simulated scanner disk/read failure before writing report" >&2\nexit 1\n'); f.chmod(0o755)
run('scanner-exit1-no-report',[node,'scripts/quality/secrets.mjs'],{'PATH':str(fake)+':'+os.environ['PATH']})
run('scanner-exit1-no-report-all',[node,'scripts/quality/secrets.mjs','--all-branches'],{'PATH':str(fake)+':'+os.environ['PATH']})
missing=ev/'missing-scanner'; missing.mkdir(exist_ok=True)
for tool in ['git']:
    f=missing/tool
    if not f.exists(): f.symlink_to(shutil.which(tool))
preload=ev/'offline.cjs'; preload.write_text("globalThis.fetch = async () => { throw new Error('induced network unavailable') }\n")
run('scanner-missing-offline',[node,'--require',str(preload),'scripts/quality/secrets.mjs'],{'PATH':str(missing)})
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
shallow=root/'.git/shallow'
try:
    shallow.write_text(head+'\n')
    run('shallow-secrets',[node,'scripts/quality/secrets.mjs'])
finally:
    shallow.unlink()
ref='refs/remotes/origin/dev'
old=subprocess.check_output(['git','rev-parse',ref],cwd=root,text=True).strip()
try:
    subprocess.run(['git','update-ref','-d',ref],cwd=root,check=True)
    run('missing-dev-secrets',[node,'scripts/quality/secrets.mjs'],{'PATH':str(fake)+':'+os.environ['PATH']})
finally:
    subprocess.run(['git','update-ref',ref,old],cwd=root,check=True)
(ev/'results-early.json').write_text(json.dumps(results,indent=2)+'\n')
