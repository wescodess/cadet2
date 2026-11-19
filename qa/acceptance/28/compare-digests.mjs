import fs from 'node:fs/promises';
import path from 'node:path';
const root='/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2';
const rows=[];
for(const artifact of ['base','candidate'])for(const batch of ['ui','ui-ready','probes']){
 const dir=path.join(root,artifact);
 const before=await fs.readFile(path.join(dir,`before-${batch}.json`),'utf8').then(JSON.parse).catch(()=>null);
 const after=await fs.readFile(path.join(dir,`after-${batch}.json`),'utf8').then(JSON.parse).catch(()=>null);
 if(!before||!after)continue;
 const changed={};
 for(const store of ['convex','sql'])changed[store]=[...new Set([...Object.keys(before[store]),...Object.keys(after[store])])].sort().filter(t=>JSON.stringify(before[store][t])!==JSON.stringify(after[store][t])).map(table=>({table,before:before[store][table]||null,after:after[store][table]||null}));
 rows.push({artifact,batch,changed,allTablesUnchanged:!changed.convex.length&&!changed.sql.length,
  expected:'Ticket 28 AC1/AC2 and LR L170: "no data read/job/write/provider side effect"; table equality proves retained row equality, not physical read instrumentation.'});
}
await fs.writeFile(path.join(root,'digest-comparisons.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(r=>({artifact:r.artifact,batch:r.batch,allTablesUnchanged:r.allTablesUnchanged,convexChanges:r.changed.convex.map(t=>t.table),sqlChanges:r.changed.sql.map(t=>t.table)})),null,2));
