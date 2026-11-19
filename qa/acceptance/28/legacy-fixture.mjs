// A real pre-containment public seam creates the historical synthetic records.
// The candidate receives only that retained legacy data through the public CLI.
import fs from 'node:fs/promises';
const accounts=JSON.parse(await fs.readFile(process.env.QA_ACCOUNTS,'utf8'));
for(const owner of ['own','foreign']){
 const a=accounts.probes[owner==='own'?'client':'foreign'];
 const args={userId:a.userId,runId:`qa28-${owner}-unsigned`,profileSnapshotId:`qa28-${owner}-snapshot`,status:'completed'};
 const response=await fetch(`${process.env.QA_CONVEX_URL}/api/mutation`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:'recommendationRuns:seedRunForUser',args,format:'json'})});
 const body=await response.json();
 if(body.status!=='success')throw Error(`Legacy fixture public seam: ${JSON.stringify(body)}`);
 console.log(`Created real ${owner} unsigned legacy run through the public base function`);
}
