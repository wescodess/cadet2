import pathlib,subprocess,os,json,shutil,time
root=pathlib.Path('/private/tmp/impl-24');scratch=pathlib.Path('/private/tmp/impl-24-scratch/deliberate');scratch.mkdir(exist_ok=True)
env={**os.environ,'TMPDIR':'/private/tmp/impl-24-scratch','QUALITY_BASE_REF':'HEAD'};ledger=[]
block='\n'.join(f"console.log('deliberate operation {i}', {i} * 23)" for i in range(20))
cases=[
 ('cycle','boundaries',{'shared/a.ts':"import { b } from './b'; export const a = () => b()",'shared/b.ts':"import { a } from './a'; export const b = () => a()"},{'shared/b.ts':'export const b = () => 1'}),
 ('private-import','boundaries',{'shared/consumer.ts':"import { secret } from './feature/private/index'; console.log(secret)",'shared/feature/private/index.ts':'export const secret = 1'},{'shared/consumer.ts':'console.log(1)'}),
 ('unused-file','dead-code',{'shared/unused.ts':'export const value = 1','index.ts':'console.log(1)'},{'index.ts':"import { value } from './shared/unused'; console.log(value)"}),
 ('unused-export','dead-code',{'index.ts':"import { used } from './shared/value'; console.log(used)",'shared/value.ts':'export const used = 1; export const unused = 2'},{'index.ts':"import { used, unused } from './shared/value'; console.log(used, unused)"}),
 ('unused-dependency','dead-code',{'index.ts':'console.log(1)','package.json':'{"name":"fixture","type":"module","dependencies":{"zod":"3.25.76"}}'},{'index.ts':"import { z } from 'zod'; console.log(z.string())"}),
 ('duplication','duplication',{'shared/original.ts':block},{'shared/copy.ts':'console.log("unique")'}),
]
for name,row,files,control in cases:
 d=scratch/name;d.mkdir(exist_ok=True)
 def put(file,text):
  p=d/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
 put('.gitignore','node_modules/\n.quality-output/\n');put('package.json','{"name":"fixture","type":"module","private":true}')
 for r in ['boundaries','dead-code','duplication']:put(f'scripts/quality/baselines/{r}.json',json.dumps({'date':'2026-11-21','commit':'d7fb8a4ac9c25dfe65e8ba84680ff2f40cb3a501','counts':{}}))
 for file,text in files.items():put(file,text)
 (d/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
 for args in [['init','-q'],['add','.'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']]:subprocess.run(['git',*args],cwd=d,check=True,capture_output=True)
 put('.git/objects/info/alternates',str(root/'.git/objects')+'\n')
 if name=='duplication':put('shared/copy.ts',block)
 entry={'case':name,'row':row,'seam':'S24','expected':[1,0],'runs':[]}
 for phase in ['deliberate-red','positive']:
  if phase=='positive':
   for file,text in control.items():put(file,text)
  start=time.time();p=subprocess.run(['node',str(root/f'scripts/quality/{row}.mjs')],cwd=d,env=env,text=True,capture_output=True)
  output=(p.stdout+p.stderr).replace(str(d),'<fixture>').replace(str(root),'<repository>')
  artifact=f'{name}-{phase}.txt';(scratch/artifact).write_text(output)
  entry['runs'].append({'phase':phase,'command':f'node scripts/quality/{row}.mjs','exit':p.returncode,'seconds':round(time.time()-start,3),'artifact':artifact})
 ledger.append(entry)
 if [r['exit'] for r in entry['runs']]!=[1,0]:raise RuntimeError(entry)
(scratch/'ledger.json').write_text(json.dumps(ledger,indent=2)+'\n')
print('6 deliberate-red/positive pairs passed',flush=True)
