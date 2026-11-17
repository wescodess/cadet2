import os,pathlib,shutil,subprocess,time,json
root=pathlib.Path('/tmp/fix-pr55-r2'); ev=pathlib.Path('/tmp/review-pr55-r2-evidence/fix-after'); fake=ev/'concurrent-pnpm'; fake.mkdir(exist_ok=True); node=shutil.which('node')
f=fake/'pnpm'; f.write_text('''#!'''+node+'''
const fs=require('fs'); const id=process.env.REVIEW_RUN_ID; const row=process.argv[3];
if(row==='typecheck') fs.writeFileSync((process.env.QUALITY_OUTPUT_DIR || '.quality-output')+'/types.txt',id==='A'?'Run A: failed typecheck diagnostics\\n':'Run B: passed typecheck diagnostics\\n');
if(row==='build'&&id==='A') {
 fs.writeFileSync('.cache/review55-concurrent-ready','ready');
 const timer=setInterval(()=>{if(fs.existsSync('.cache/review55-concurrent-release')){clearInterval(timer);process.exit(0)}},25);
} else process.exit(row==='typecheck'&&id==='A'?1:0);
''');f.chmod(0o755)
ready=root/'.cache/review55-concurrent-ready'; release=root/'.cache/review55-concurrent-release'; ready.unlink(missing_ok=True);release.unlink(missing_ok=True)
env=os.environ.copy();env['PATH']=str(fake)+':'+env['PATH']
a_log=open(ev/'concurrency-a.txt','w'); a=subprocess.Popen([node,'scripts/quality/verify.mjs'],cwd=root,env=dict(env,REVIEW_RUN_ID='A'),stdout=a_log,stderr=subprocess.STDOUT)
try:
    deadline=time.monotonic()+30
    while not ready.exists():
        if a.poll() is not None or time.monotonic()>deadline: raise RuntimeError('Run A did not reach build pause')
        time.sleep(.05)
    b=subprocess.run([node,'scripts/quality/verify.mjs'],cwd=root,env=dict(env,REVIEW_RUN_ID='B'),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=30)
    (ev/'concurrency-b.txt').write_text(b.stdout)
    release.write_text('release'); a.wait(timeout=30); a_log.close()
    directories={k:root/next(line.split('Quality evidence: ')[1] for line in (ev/('concurrency-'+k.lower()+'.txt')).read_text().splitlines() if 'Quality evidence: ' in line) for k in ['A','B']}
    result={'A_exit':a.returncode,'B_exit':b.returncode,'runs':{k:{'directory':str(d), 'verification':json.loads((d/'verification.json').read_text()), 'types':(d/'types.txt').read_text()} for k,d in directories.items()}}
    (ev/'concurrency-result.json').write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))
finally:
    if a.poll() is None: a.kill(); a.wait()
    a_log.close();ready.unlink(missing_ok=True); release.unlink(missing_ok=True)
