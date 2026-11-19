// Security contract probes, deliberately separate from the real-user UI journeys.
import fs from 'node:fs/promises';
import path from 'node:path';
import { oracle, oldApi, exportsToClose } from './oracles.ts';
const data=JSON.parse(await fs.readFile(process.env.QA_ACCOUNTS,'utf8'));
const url=process.env.QA_URL, convex=process.env.QA_CONVEX_URL;
const out=process.env.QA_EVIDENCE;
if(!url||!convex||!out)throw Error('Set QA_URL, QA_CONVEX_URL, QA_ACCOUNTS, QA_EVIDENCE');
await fs.mkdir(out,{recursive:true});
const rows=[];
const backendLog=process.env.QA_BACKEND_LOG;
const logStart=backendLog?(await fs.stat(backendLog)).size:0;
const who=['visitor','client','foreign','admin'];
const signed=data.probes;
const own=signed.client.userId, foreign=signed.foreign.userId;
const privateKeys=/"(?:inputSnapshot|rankedRecommendations|fitSignals|overallConfidenceChange|improvementActions|nextStepPlan|profileSnapshot)"\s*:/;
for(const persona of who){
 const a=signed[persona];
 const headers=a?{cookie:a.cookies.map(c=>`${c.name}=${c.value}`).join('; ')}:{};
 // AC1/LR L170: every method, query/body/deep-link/SSR variant closes before effects.
 for(const route of oldApi){
  for(const method of ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']){
   const variants=method==='GET'||method==='POST'?['','?runId=qa28-own-unsigned&sourceRunId=qa28-foreign-unsigned&left=qa28-own-unsigned&right=qa28-foreign-unsigned&status=completed&count=true&mode=mock&force=true']:[''];
   for(const query of variants){
    const response=await fetch(`${url}${route}${query}`,{method,redirect:'manual',headers:{...headers,accept:'application/json','content-type':'application/json'},...(method!=='GET'&&method!=='HEAD'?{body:JSON.stringify({userId:own,runId:'qa28-own-unsigned',sourceRunId:'qa28-foreign-unsigned',mode:'mock',force:true})}:{})});
    const body=await response.text();
    rows.push({batch:'http',persona,route:route+query,method,status:response.status,location:response.headers.get('location'),pass:response.status===404&&!response.headers.get('location')&&!privateKeys.test(body)&&!body.includes('QA28_PRIVATE_UNSIGNED_'),expected:`${oracle.close}; ${oracle.helpers}; ${oracle.noEffects}`,body:body.slice(0,2500)});
   }
  }
 }
}
await fs.writeFile(path.join(out,'http.json'),JSON.stringify(rows,null,2));
if(backendLog){
 const log=(await fs.readFile(backendLog)).subarray(logStart).toString();
 await fs.writeFile(path.join(out,'http-backend.log'),log);
 await fs.writeFile(path.join(out,'http-backend-calls.json'),JSON.stringify({publicFunctionRpcRequests:(log.match(/POST \/api\/(?:query|mutation|action) HTTP/g)||[]).length,note:'Backend log segment brackets only the retired HTTP batch, before direct-Convex probes and the admitted control.'},null,2));
}
const rpc=[];
for(const phase of ['query','mutation'])for(const persona of who){
 for(const target of ['own','foreign']){
  const userId=target==='own'?own:foreign,runId=`qa28-${target}-unsigned`;
  for(const [kind,name] of exportsToClose){
   if(kind!==phase)continue;
   let args={userId,runId};
   if(name.endsWith(':list')||name.endsWith(':getAuditSummary'))args={};
   if(/:(?:listForUser|listRunsForUserTesting|resetRunsForUser)$/.test(name))args={userId};
   if(name.endsWith(':listForAdmin')||name.endsWith(':listAuditEvents'))args={};
   if(name.endsWith(':getAuditEvent'))args={eventId:'qa28-nonexistent-event'};
   if(/:(?:readRankedRecommendationsForAdmin)$/.test(name))args={runId};
   if(/:(?:seedRunForUser|createQueuedRun)$/.test(name))args={userId,runId,profileSnapshotId:`qa28-${target}-snapshot`,...(name.endsWith(':seedRunForUser')?{status:'completed'}:{})};
   if(name.endsWith(':setTerminalStatusForUser'))args={userId,runId,status:'completed'};
   if(name.endsWith(':writePathwayEvaluationForUser'))args={userId,runId,profileSnapshotId:`qa28-${target}-snapshot`,direct:[],blocked:[]};
   if(name.endsWith(':writeRankedRecommendationsForUser'))args={userId,runId,profileSnapshotId:`qa28-${target}-snapshot`,direct:[],blocked:[],composed:[]};
   // Public availability is observable even when legacy argument validation rejects a payload.
   const response=await fetch(`${convex}/api/${kind}`,{method:'POST',headers:{'content-type':'application/json',...(signed[persona]?.token?{authorization:`Bearer ${signed[persona].token}`}:{})},body:JSON.stringify({path:name,args,format:'json'})});
   const body=await response.text();
   const pass=/could not find public function|not a public function|internal function/i.test(body);
   rpc.push({batch:'convex',persona,target,kind,name,status:response.status,pass,expected:oracle.public,body:body.slice(0,4500)});
  }
 }
}
await fs.writeFile(path.join(out,'convex.json'),JSON.stringify(rpc,null,2));
// Admitted positive control for preserved operation, with the real stored admin grant/session.
const admin=signed.admin;
const res=await fetch(`${url}/api/admin/access`,{headers:{cookie:admin.cookies.map(c=>`${c.name}=${c.value}`).join('; ')}});
const body=await res.text();
const positive={status:res.status,pass:res.status===200,body,expected:oracle.admin};
await fs.writeFile(path.join(out,'positive-control.json'),JSON.stringify(positive,null,2));
const summary={http:{total:rows.length,passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass).length},convex:{total:rpc.length,passed:rpc.filter(r=>r.pass).length,failed:rpc.filter(r=>!r.pass).length},positive};
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
process.exitCode=summary.http.failed||summary.convex.failed||!positive.pass?1:0;
