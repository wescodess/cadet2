import os, pathlib, subprocess, shutil, json, copy, http.server, threading, time
root=pathlib.Path('/tmp/fix-pr55-r2'); ev=pathlib.Path('/tmp/review-pr55-r2-evidence/fix-after'); node=shutil.which('node'); results=[]
fake=ev/'extra-bin'; fake.mkdir(exist_ok=True)
def tool(name,source):
 p=fake/name; p.write_text('#!'+node+'\n'+source); p.chmod(0o755)
def run(name,args,extra=None,expected=1):
 env=os.environ.copy(); env.update(extra or {}); start=time.monotonic()
 p=subprocess.run(args,cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=10)
 (ev/(name+'.txt')).write_text(p.stdout); result={'probe':name,'command':args,'env':extra or {},'exit':p.returncode,'expected':expected,'seconds':round(time.monotonic()-start,2)};results.append(result);print(name,p.returncode,flush=True)
 assert p.returncode==expected,result
base={'PATH':str(fake)+':'+os.environ['PATH']}
tool('gitleaks',"""
const fs=require('fs'); if(process.argv[2]==='version'){console.log('8.30.1');process.exit(0)}
const file=process.argv.find(x=>x.startsWith('--report-path=')).split('=')[1];const mode=process.env.FIX_MODE;
if(mode==='fresh-report' && !file.endsWith('history.json')) process.exit(0);
if(mode==='missing-report') process.exit(0);
fs.writeFileSync(file, mode==='malformed-report' ? '[{}]' : '[]');process.exit(mode==='inconsistent-report'?42:0)
""")
for mode in ['missing-report','malformed-report','inconsistent-report','fresh-report']:
 run('scanner-'+mode,[node,'scripts/quality/secrets.mjs'],dict(base,FIX_MODE=mode))
tool('pnpm',"""
const fs=require('fs'); const a=process.argv.slice(2); const mode=process.env.FIX_MODE;
if(a[0]==='install'||a[1]==='nuxt')process.exit(0);
if(a[0]==='audit'){fs.writeFileSync(1,fs.readFileSync(process.env.FIX_AUDIT_FILE));process.exit(1)}
if(a[0]==='licenses'){console.log('{"MIT":[]}');process.exit(0)}
if(a[0]==='exec'){
 if(mode==='signal')process.kill(process.pid,'SIGTERM');
 if(mode==='clean')process.exit(0);
 if(mode==='incomplete-line'){fs.writeFileSync(1,'partial compiler line');process.exit(1)}
 const b=a[1]==='tsc'?'types-convex':'types';const [file,code]=Object.keys(JSON.parse(fs.readFileSync('scripts/quality/baselines/'+b+'.json')).counts)[0].split('|');
 console.log(file+'(1,1): error '+code+': existing diagnostic');console.log('  Valid diagnostic continuation.');
 if(mode==='trailing-garbage')console.log('Unexpected compiler output');
 process.exit(Number(process.env.FIX_EXIT||1));
}
process.exit(99)
""")
for mode,expected in [('signal',1),('trailing-garbage',1),('incomplete-line',1),('clean',0)]:
 run('types-'+mode,[node,'scripts/quality/types.mjs'],dict(base,FIX_MODE=mode),expected)
for status in [1,2,137]:
 run('types-exit-'+str(status),[node,'scripts/quality/types.mjs'],dict(base,FIX_MODE='diagnostic',FIX_EXIT=str(status)),0 if status in [1,2] else 1)
real=json.loads((ev.parent/'fix-real-audit.json').read_text())
mutations={
 'metadata-mismatch':lambda x:x['metadata']['vulnerabilities'].__setitem__('high',x['metadata']['vulnerabilities']['high']+1),
 'unknown-severity':lambda x:next(iter(x['advisories'].values())).__setitem__('severity','unknown'),
 'missing-severity':lambda x:x['metadata']['vulnerabilities'].pop('low'),
 'extra-severity':lambda x:x['metadata']['vulnerabilities'].__setitem__('unknown',0),
 'negative-count':lambda x:x['metadata']['vulnerabilities'].__setitem__('high',-1),
 'unmatched-path':lambda x:next(iter(x['advisories'].values()))['findings'][0].__setitem__('paths',['unmatched']),
 'empty-paths':lambda x:next(iter(x['advisories'].values()))['findings'][0].__setitem__('paths',[]),
 'identity-mismatch':lambda x:next(iter(x['advisories'].values())).__setitem__('id',1),
 'empty-advisories':lambda x:x.__setitem__('advisories',{}),
 'valid':lambda x:None,
}
fixture=ev/'audit-fixture.json'
try:
 for name,mutate in mutations.items():
  data=copy.deepcopy(real);mutate(data);fixture.write_text(json.dumps(data))
  run('audit-'+name,[node,'scripts/quality/dependencies.mjs'],dict(base,FIX_AUDIT_FILE=str(fixture)),0 if name=='valid' else 1)
finally:fixture.unlink(missing_ok=True)
for flag in ['--write-baseline','--write','--fix','--update-baseline']:
 run('ci-flag-'+flag[2:],[node,'scripts/quality/test-policy.mjs',flag],{'GITHUB_ACTIONS':'true'})
# Request headers and body each stall on a real HTTP connection; preserve fetch's signal.
class Handler(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  if self.path=='/body':self.send_response(200);self.end_headers();self.wfile.flush()
  time.sleep(2)
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
missing=ev/'download-bin';missing.mkdir(exist_ok=True)
(missing/'git').symlink_to(shutil.which('git')) if not (missing/'git').exists() else None
preload=ev/'stall-download.cjs';preload.write_text("const real=globalThis.fetch;globalThis.fetch=(_url,options)=>real(process.env.FIX_DOWNLOAD_URL,options);\n")
try:
 for path in ['headers','body']:
  run('download-timeout-'+path,[node,'--require',str(preload),'scripts/quality/secrets.mjs'],{'PATH':str(missing),'QUALITY_TIMEOUT_MS':'100','FIX_DOWNLOAD_URL':f'http://127.0.0.1:{server.server_port}/{path}'})
finally:server.shutdown();server.server_close()
# A timed-out row remains failed in the aggregate and later rows still execute.
tool('pnpm',"if(process.argv[3]==='typecheck')setTimeout(()=>process.exit(0),60000);else process.exit(0)\n")
run('verify-row-timeout',[node,'scripts/quality/verify.mjs'],dict(base,QUALITY_TIMEOUT_MS='1500'))
directory=next(line.split('Quality evidence: ')[1] for line in (ev/'verify-row-timeout.txt').read_text().splitlines() if 'Quality evidence: ' in line)
manifest=json.loads((root/directory/'verification.json').read_text())
assert len(manifest)==8 and manifest[0]['status']=='FAIL' and all(row['status']=='PASS' for row in manifest[1:]),manifest
(ev/'verify-row-timeout.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ev/'extra-results.json').write_text(json.dumps(results,indent=2)+'\n')
