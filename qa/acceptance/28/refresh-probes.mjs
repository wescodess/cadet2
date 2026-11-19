// Public auth token refresh outside security probes and user journeys.
import fs from 'node:fs/promises';
const file=process.env.QA_ACCOUNTS,data=JSON.parse(await fs.readFile(file,'utf8'));
for(const [persona,a] of Object.entries(data.probes)){
 const r=await fetch(`${process.env.QA_URL}/api/auth/convex/token`,{headers:{cookie:a.cookies.map(c=>`${c.name}=${c.value}`).join('; ')}});
 const body=await r.json();
 if(!body.token)throw Error(`Real JWT refresh failed for ${persona}`);
 a.token=body.token;
}
await fs.writeFile(file,JSON.stringify(data,null,2),{mode:0o600});
// Exercise the admitted inventory control before the before-batch snapshot too;
// this keeps any historical initialization separate from denied-request effects.
const admin=data.probes.admin;
const control=await fetch(`${process.env.QA_URL}/api/admin/pathways`,{headers:{cookie:admin.cookies.map(c=>`${c.name}=${c.value}`).join('; ')}});
await fs.writeFile(file.replace('.json','-control.json'),JSON.stringify({status:control.status,body:await control.text()},null,2),{mode:0o600});
console.log('Refreshed genuine probe JWTs through the public auth endpoint');
