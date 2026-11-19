// Operator-only local bootstrap. No deployed route or app code is changed.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=path.resolve(process.argv[2]);
const config=JSON.parse(await fs.readFile(path.join(root,'.nuxt/hub/db/config.json'),'utf8'));
const schema=await import(pathToFileURL(path.join(root,'.nuxt/hub/db/schema.mjs')).href);
const dbDir=path.resolve(root,config.db.connection.dataDir);
await fs.mkdir(path.dirname(dbDir),{recursive:true});
const client=new PGlite(dbDir);
try{
 const plan=await pushSchema(schema,drizzle(client));
 if(plan.hasDataLoss)throw Error('Refuse destructive initialization');
 await plan.apply();
 console.log(JSON.stringify({dbDir,statements:plan.statementsToExecute.length,tables:(await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows}));
}finally{await client.close();}
