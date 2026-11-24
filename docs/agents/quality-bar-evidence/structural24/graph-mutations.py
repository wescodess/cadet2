from pathlib import Path
import subprocess,os,json,time
root=Path('/private/tmp/impl-24');scratch=Path('/private/tmp/impl-24-scratch');directory=scratch/'mutations';path=root/'scripts/quality/boundaries.parser.mjs';original=path.read_text();ledger=json.loads((directory/'ledger.json').read_text())
mutants=[('boundaries-permissive','.strict()','.passthrough()'),('boundaries-ignore-completeness','if (!valid)','if (false && !valid)'),('boundaries-ignore-graph','summary.error > 0 === dependencies.some((dependency) => !dependency.valid) &&','true &&')]
for name,old,new in mutants:
 assert old in original,name
 start=time.time()
 try:
  path.write_text(original.replace(old,new))
  with (directory/(name+'.txt')).open('w') as log:
   p=subprocess.run(['pnpm','exec','vitest','run','tests/unit/quality-parsers.spec.mjs','tests/unit/quality-structural-rows.spec.mjs','--maxWorkers=2'],cwd=root,env={**os.environ,'TMPDIR':str(scratch)},stdout=log,stderr=subprocess.STDOUT)
  assert p.returncode==1,name
  result={'name':name,'file':'scripts/quality/boundaries.parser.mjs','exit':p.returncode,'caught':True,'seconds':round(time.time()-start,2)}
  ledger=[item for item in ledger if item['name']!=name]+[result]
 finally:path.write_text(original)
(directory/'ledger.json').write_text(json.dumps(ledger,indent=2)+'\n')
print('18/18 selected mutants caught; final graph parser restored')
