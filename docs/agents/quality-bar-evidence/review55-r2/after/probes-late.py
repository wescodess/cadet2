import os, pathlib, subprocess, json, shutil, signal, time, hashlib
root=pathlib.Path('/tmp/fix-pr55-r2'); ev=pathlib.Path('/tmp/review-pr55-r2-evidence/fix-after'); node=shutil.which('node'); realpnpm=shutil.which('pnpm'); results=[]
def run(name,args,extra=None,timeout=30):
    env=os.environ.copy(); env.update(extra or {})
    p=subprocess.Popen(args,cwd=root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
    try: out,_=p.communicate(timeout=timeout); code=p.returncode
    except subprocess.TimeoutExpired:
        os.killpg(p.pid,signal.SIGTERM); out,_=p.communicate(); code='EXTERNAL_TIMEOUT'
    (ev/(name+'.txt')).write_text(out); results.append({'probe':name,'command':args,'env':extra or {},'exit':code})
    print(name,'exit',code,out[-1400:],flush=True); return code
fake=ev/'fake-pnpm'; fake.mkdir(exist_ok=True)
f=fake/'pnpm'
f.write_text('''#!'''+node+'''
const fs = require('fs'); const cp = require('child_process'); const args=process.argv.slice(2); const mode=process.env.REVIEW_PROBE;
if (mode === 'hook') { if (args[0] === 'typecheck') { console.error('induced typecheck failure'); process.exit(1) } const p=cp.spawnSync(process.env.REVIEW_REAL_PNPM,args,{stdio:'inherit'}); process.exit(p.status ?? 1) }
if(args[0]==='install') process.exit(0);
if(args[0]==='audit') {
 if(mode==='garbage') { console.log('unparseable audit garbage'); process.exit(0) }
 if(mode==='malformed') { console.log(JSON.stringify({advisories:{unknown:{severity:'unrecognized'}},metadata:{vulnerabilities:{high:1}}})); process.exit(1) }
 if(mode==='offline') { console.error('induced registry connection failure'); process.exit(2) }
 if(mode==='hang') { setTimeout(()=>process.exit(0),60000); return }
}
if(args[0]==='licenses') { console.log('{"MIT":[]}'); process.exit(0) }
if(args[0]==='exec') {
 if(args[1]==='nuxt') process.exit(0);
 if(mode==='type-garbage') { console.log('unexpected non-compiler output'); process.exit(0) }
 if(mode==='type-crash') {
 const baseline=args[1]==='tsc'?'types-convex':'types';
 const counts=JSON.parse(fs.readFileSync('scripts/quality/baselines/'+baseline+'.json','utf8')).counts;
 const [file,code]=Object.keys(counts)[0].split('|');
 console.log(file+'(1,1): error '+code+': existing diagnostic emitted before failure');
 console.error('Killed: compiler aborted before completing its project'); process.exit(137)
 }
}
console.error('Unexpected fake-pnpm call: '+args.join(' ')); process.exit(99)
''');f.chmod(0o755)
env={'PATH':str(fake)+':'+os.environ['PATH'], 'QUALITY_TIMEOUT_MS':'1000'}
for mode in ['garbage','malformed','offline','hang']:
    run('audit-'+mode,[node,'scripts/quality/dependencies.mjs'],dict(env,REVIEW_PROBE=mode),timeout=3 if mode=='hang' else 30)
for mode in ['type-crash','type-garbage']:
    run(mode,[node,'scripts/quality/types.mjs'],dict(env,REVIEW_PROBE=mode))
invalid=ev/'invalid-gitleaks.toml'; invalid.write_text('this is [ invalid toml')
run('scanner-real-invalid-config',[node,'scripts/quality/secrets.mjs'],{'GITLEAKS_CONFIG':str(invalid)})
# Baseline writer must not run under CI, even with an explicitly requested measurement flag.
baseline=root/'scripts/quality/baselines/test-policy.json'; original=baseline.read_bytes()
ci_probe=root/'tests/e2e/intake-draft.atdd.spec.ts'; ci_original=ci_probe.read_bytes()
ci_probe.write_bytes(ci_original+b"\ntest.skip('review55 CI writer probe', () => {})\n")
run('ci-policy-before-writer',[node,'scripts/quality/test-policy.mjs'],{'CI':'true'})
run('ci-write-baseline',[node,'scripts/quality/test-policy.mjs','--write-baseline'],{'CI':'true'})
run('ci-policy-after-writer',[node,'scripts/quality/test-policy.mjs'],{'CI':'true'})
(ev/'ci-write-baseline-state.json').write_text(json.dumps({'baseline_bytes_changed':baseline.read_bytes()!=original,'before_sha256':hashlib.sha256(original).hexdigest(),'after_sha256':hashlib.sha256(baseline.read_bytes()).hexdigest()},indent=2)+'\n')
baseline.write_bytes(original); ci_probe.write_bytes(ci_original)
(ev/'results-late.json').write_text(json.dumps(results,indent=2)+'\n')
