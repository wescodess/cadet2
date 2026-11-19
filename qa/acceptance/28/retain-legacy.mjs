// Retain the public-seam-created synthetic legacy data across the artifact change.
// Operator import is explicit setup; the candidate gets no fixture route or stub.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve('.'),base=path.join(root,'.artifacts/base'),candidate=path.join(root,'.artifacts/candidate');
const source=path.join(root,'.scratch/base-legacy.zip'),target=path.join(root,'.scratch/candidate-legacy.json');
execFileSync('pnpm',['exec','convex','export','--path',source,'--env-file','.qa-selfhost.env'],{cwd:base,stdio:'pipe'});
const a=JSON.parse(await fs.readFile('.scratch/base-accounts.json','utf8'));
const b=JSON.parse(await fs.readFile('.scratch/candidate-accounts.json','utf8'));
const mapping={};
for(const [group,values] of Object.entries(a))for(const [persona,user] of Object.entries(values)){
 mapping[user.userId]=b[group][persona].userId;
 b[group][persona].ownRunId=user.ownRunId;
}
const mapFile=path.join(root,'.scratch/legacy-identity-map.json');
await fs.writeFile(mapFile,JSON.stringify(mapping),{mode:0o600});
execFileSync('python3',['-c',`import zipfile,json,sys
mapping=json.load(open(sys.argv[2]))
with zipfile.ZipFile(sys.argv[1]) as z:
 rows=[json.loads(x) for x in z.read('recommendation_runs/documents.jsonl').decode().splitlines() if x]
def rewrite(value):
 if isinstance(value,dict):return {k:rewrite(v) for k,v in value.items() if k not in ['_id','_creationTime']}
 if isinstance(value,list):return [rewrite(v) for v in value]
 if isinstance(value,str):return mapping.get(value,value)
 return value
json.dump([rewrite(r) for r in rows],open(sys.argv[3],'w'))
print('Retained',len(rows),'actual base-created legacy records; remapped only isolated account identities')`,source,mapFile,target],{stdio:'inherit'});
execFileSync('pnpm',['exec','convex','import','--table','recommendation_runs','--replace','--yes',target,'--env-file','.qa-selfhost.env'],{cwd:candidate,stdio:'inherit'});
await fs.writeFile('.scratch/candidate-accounts.json',JSON.stringify(b,null,2),{mode:0o600});
