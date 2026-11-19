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
console.log('Refreshed genuine probe JWTs through the public auth endpoint');
