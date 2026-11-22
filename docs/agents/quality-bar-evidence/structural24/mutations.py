import pathlib,subprocess,os,json,time
root=pathlib.Path('/private/tmp/impl-24');out=pathlib.Path('/private/tmp/impl-24-scratch/mutations');out.mkdir(exist_ok=True)
mutants=[
('boundaries-empty','scripts/quality/boundaries.mjs',"for (const violation of report.summary.violations)","for (const violation of [])"),
('dead-files','scripts/quality/dead-code.mjs',"for (const symbol of symbols)","for (const symbol of kind === 'files' ? [] : symbols)"),
('dead-exports','scripts/quality/dead-code.mjs',"for (const symbol of symbols)","for (const symbol of kind === 'exports' ? [] : symbols)"),
('dead-dependencies','scripts/quality/dead-code.mjs',"for (const symbol of symbols)","for (const symbol of kind === 'dependencies' ? [] : symbols)"),
('duplication-empty','scripts/quality/duplication.mjs',"for (const clone of report.duplicates)","for (const clone of [])"),
('duplication-changed-only','scripts/quality/duplication.mjs',"...selected,","...selected.filter((file) => changed.has(file)),"),
('new-files-allowance','scripts/quality/common.mjs',"if (!legacy.has(key.split('|')[0]))", "if (false && !legacy.has(key.split('|')[0]))"),
('paid-down-dead-code','scripts/quality/common.mjs',"if (full) {", "if (full && name !== 'dead-code') {"),
('paid-down-duplication','scripts/quality/common.mjs',"if (!scope(key)) continue", "if (!scope(key) || name === 'duplication') continue"),
('boundaries-no-ratchet','scripts/quality/boundaries.mjs',"ratchet('boundaries', counts, { commit: structuralCommit })", "console.log('boundaries: PASS')"),
('dead-code-no-ratchet','scripts/quality/dead-code.mjs',"ratchet('dead-code', counts, { commit: structuralCommit })", "console.log('dead-code: PASS')"),
('duplication-no-ratchet','scripts/quality/duplication.mjs',"ratchet('duplication', counts, {", "console.log('duplication: PASS', {"),
('boundaries-permissive','scripts/quality/boundaries.parser.mjs',".strict()", ".passthrough()"),
('dead-code-permissive','scripts/quality/dead-code.parser.mjs',".strict()", ".passthrough()"),
('duplication-permissive','scripts/quality/duplication.parser.mjs',".strict()", ".passthrough()"),
('boundaries-ignore-completeness','scripts/quality/boundaries.parser.mjs',"if (!valid)","if (false && !valid)"),
('duplication-ignore-completeness','scripts/quality/duplication.parser.mjs',"if (!valid)","if (false && !valid)"),
]
ledger=[]
env={**os.environ,'TMPDIR':'/private/tmp/impl-24-scratch'}
for name,file,old,new in mutants:
 path=root/file;original=path.read_text()
 if old not in original:raise RuntimeError('Missing mutation '+name)
 start=time.time()
 try:
  path.write_text(original.replace(old,new))
  with (out/(name+'.txt')).open('w') as log:
   p=subprocess.run(['pnpm','exec','vitest','run','--maxWorkers=2','tests/unit/quality-structural.spec.mjs','tests/unit/quality-structural-rows.spec.mjs','tests/unit/quality-parsers.spec.mjs'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
  result={'name':name,'file':file,'exit':p.returncode,'caught':p.returncode==1,'seconds':round(time.time()-start,2)}
  ledger.append(result);(out/'ledger.json').write_text(json.dumps(ledger,indent=2)+'\n');print(json.dumps(result),flush=True)
 finally:path.write_text(original)
if not all(x['caught'] for x in ledger):raise SystemExit(1)
