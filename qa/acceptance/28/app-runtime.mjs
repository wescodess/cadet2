// Serve the untouched production artifact with a repeatable isolated environment.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]),port=Number(process.argv[3]),convexPort=Number(process.argv[4]);
const role=path.basename(root),scratch=path.join(path.dirname(path.dirname(root)),'.scratch');
const secretFile=path.join(scratch,`${role}-runtime-secret`);
const backend=JSON.parse(await fs.readFile(path.join(root,'.convex/local/default/config.json'),'utf8'));
let secret=await fs.readFile(secretFile,'utf8').catch(()=>null);
if(!secret){secret=crypto.randomBytes(32).toString('hex');await fs.writeFile(secretFile,secret,{mode:0o600});}
Object.assign(process.env,{NITRO_HOST:'127.0.0.1',NITRO_PORT:String(port),BETTER_AUTH_SECRET:secret,
 NUXT_PUBLIC_SITE_URL:`http://127.0.0.1:${port}`,CONVEX_SITE_URL:`http://127.0.0.1:${port}`,
 CONVEX_URL:`http://127.0.0.1:${convexPort}`,NUXT_PUBLIC_CONVEX_URL:`http://127.0.0.1:${convexPort}`,
 CONVEX_ADMIN_KEY:backend.adminKey});
await fs.writeFile(path.join(root,'.qa-app-pid'),String(process.pid));
process.chdir(root);
await import(pathToFileURL(path.join(root,'.output/server/index.mjs')).href);
