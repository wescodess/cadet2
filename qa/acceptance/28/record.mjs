import fs from 'node:fs/promises';
import path from 'node:path';
const evidence='/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2';
const rows=[],retained=new Set(),pruned=[];
for(const artifact of ['base','candidate'])for(const run of ['ui','ui-ready']){
 const file=path.join(evidence,artifact,run,'results.json');
 const d=await fs.readFile(file,'utf8').then(JSON.parse).catch(()=>null);
 if(d){
  const walk=async s=>{
   for(const spec of s.specs||[])for(const t of spec.tests||[])for(const r of t.results||[]){
    const message=(r.errors?.[0]?.message||'').replace(/\u001b\[[0-9;]*m/g,'').split('\n').filter(Boolean).slice(0,4).join(' ').slice(0,400);
    rows.push(`| ${artifact}/${run} | ${t.projectName} | ${spec.title} | ${r.status} | ${message.replaceAll('|','/')} |`);
    const key=`${artifact}:${spec.title}`;
    if(r.status==='passed'&&retained.has(key)){
     for(const a of r.attachments||[])if(a.path&&/\.(?:zip|webm)$/.test(a.path)){
      await fs.rm(a.path,{force:true});pruned.push(a.path);
     }
    }else if(r.status==='passed')retained.add(key);
   }
   for(const child of s.suites||[])await walk(child);
  };await walk(d);
 }
}
const boundaries=[];
for(const artifact of ['base','candidate']){
 const s=await fs.readFile(path.join(evidence,artifact,'probes/summary.json'),'utf8').then(JSON.parse).catch(()=>null);
 if(s)boundaries.push(`| ${artifact} | ${s.http.passed}/${s.http.total} closed; ${s.http.failed} failed | ${s.convex.passed}/${s.convex.total} closed; ${s.convex.failed} failed | ${s.positive.pass?'passed':'failed'} (access ${s.positive.status}, inventory ${s.positive.inventory.status}) |`);
}
const report=`# Ticket 28 acceptance, retry run 2\n\nQA branch: qa/28-close-legacy-client-results.\nBase: fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3.\nCandidate: f5dd47bb9ba660cdbf576e715b3db48f0bdceae5.\nEvidence: ${evidence}/.\n\nThis is a local acceptance record, not a whole-pilot or release sign-off.\nExpected results and source quotations are in ../acceptance/28/README.md and oracles.ts.\nEarlier evidence in the parent directory is supporting/incomplete only. Setup failures are not deliberate base reds.\n\n| Artifact | Matrix | Journey | Actual status | First failure detail |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nThe ui-ready base rows repeat J28-04 with an explicit visible-heading wait and per-page screenshots; these supersede its early-frame captures for remaining-page observations.\n\n| Artifact | HTTP method/query/SSR probes | Direct Convex probes | Admitted positive control |\n| --- | --- | --- | --- |\n${boundaries.join('\n')}\n\nRecord updated: ${new Date().toISOString()}.\nDetailed JSON, traces, videos, screenshots and backend table digests remain under the evidence path.\nSuccessful duplicate matrix video/trace samples pruned: ${pruned.length}; failures and one passing sample per journey retained.\n`;
await fs.writeFile('qa/sessions/28-run-2.md',report);
await fs.writeFile(path.join(evidence,'retention.json'),JSON.stringify({pruned,retained:[...retained]},null,2));
console.log(`Recorded ${rows.length} UI results`);
