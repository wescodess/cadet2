import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { oracle, oldPages, remainingPages } from './oracles';
type Account = {email:string,password:string};
const accounts = () => JSON.parse(readFileSync(process.env.QA_ACCOUNTS!, 'utf8'));
const test = base.extend<{observed:void}>({
  observed: [async ({page},use,testInfo) => {
    const errors:string[]=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error' && !/Failed to load resource.*(?:404|401|403)/.test(m.text()))errors.push(`console: ${m.text()}`)});
    page.on('requestfailed',r=>{if(!/net::ERR_ABORTED/.test(r.failure()?.errorText||''))errors.push(`requestfailed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`)});
    // Expected failures per journey: closed bookmark 404; existing admin/tool
    // admission 401/403. #74 owns those tools' containment, not this ticket.
    page.on('response',r=>{
      if(r.status()<400)return;
      const pathname=new URL(r.url()).pathname;
      const expected=(r.status()===404&&/^\/(?:workspace|tasks)(?:\/|$)/.test(pathname))
        ||([401,403].includes(r.status())&&/^\/(?:api\/)?(?:admin|ai-search)(?:\/|$)/.test(pathname));
      if(!expected)errors.push(`unexpected HTTP ${r.status()}: ${r.request().method()} ${pathname}`);
    });
    await use();
    await testInfo.attach('browser-errors.json',{body:JSON.stringify(errors,null,2),contentType:'application/json'});
    expect.soft(errors,'REAL-USER.md: no console errors, unhandled exceptions, or unexpected failed requests').toEqual([]);
  },{auto:true}],
});

async function signIn(page:Page,account:Account){
  await page.goto('/auth');
  // Visible form-heading transition proves hydration before entering credentials.
  await expect(async()=>{
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await expect(page.getByRole('heading',{level:1})).toHaveText(/welcome back|sign in/i,{timeout:700});
  }).toPass({timeout:30000});
  await page.getByLabel(/email/i).fill(account.email);
  await page.getByLabel(/^password$/i).fill(account.password);
  await page.getByRole('button',{name:/^(?:sign in|login|log in)$/i}).last().click();
  await expect(page.getByRole('button',{name:/sign out|log out/i}).or(page.getByRole('link',{name:/sign out|log out/i}))).toBeVisible({timeout:30000});
}

async function assertClosed(page:Page,path:string){
  const response=await page.goto(path);
  expect.soft(response?.status(),`${oracle.close}; ${oracle.tasks}; ${path}`).toBe(404);
  if(response?.status()===404) await expect.soft(page.getByText(/404|not found|unavailable/i).first(),oracle.close).toBeVisible();
  expect.soft(new URL(page.url()).pathname,oracle.close).toBe(new URL(path,'http://localhost').pathname);
  await expect.soft(page.getByRole('link',{name:/signed plan/i}),oracle.close).toHaveCount(0);
  await test.info().attach(`bookmark-${encodeURIComponent(path)}.txt`,{body:(await page.getByRole('heading').allTextContents()).join('\n'),contentType:'text/plain'});
}

test('J28-01 visitor landing and retired bookmarks',async({page})=>{
  await page.goto('/');
  // LR L40: minimal public/auth entry, no debug, tasks or engine-readiness promises.
  await expect.soft(page.getByRole('link',{name:/sign in|log in|login|create account|auth/i}).first(),oracle.landing).toBeVisible();
  await expect.soft(page.getByRole('link',{name:/workspace|tasks|playground|ai search/i}),oracle.landing).toHaveCount(0);
  await expect.soft(page.getByText(/useUserSession\(\)|debug landing|engine readiness|readiness diagnostics/i),oracle.landing).toHaveCount(0);
  for(const path of oldPages) await assertClosed(page,path);
  await page.reload();
  await expect.soft(page.getByText(/404|not found|unavailable/i).first(),oracle.j10).toBeVisible();
  await page.goBack();
  await expect.soft(page.getByText(/404|not found|unavailable/i).first(),oracle.j10).toBeVisible();
});

for(const persona of ['client','admin'] as const){
  test(`J28-${persona==='client'?'02':'03'} ${persona} bookmarks, safe entry and visible sign-out`,async({page},info)=>{
    const account=accounts()[info.project.name][persona];
    await signIn(page,account);
    // LR L28/L30/L41 and ticket AC1: admission does not reopen legacy results.
    for(const path of oldPages)await assertClosed(page,path.replaceAll('qa28-own-unsigned',account.ownRunId));
    await page.goto('/');
    await expect.soft(page.getByRole('link',{name:/workspace|tasks|playground/i}),oracle.close).toHaveCount(0);
    let signOut=page.getByRole('button',{name:/sign out|log out/i}).or(page.getByRole('link',{name:/sign out|log out/i}));
    if(!await signOut.isVisible()){await page.goto('/auth');signOut=page.getByRole('button',{name:/sign out|log out/i}).or(page.getByRole('link',{name:/sign out|log out/i}));}
    await expect(signOut,`${oracle.auth}; QA plan row 116: "Auth signup/login/logout/security"`).toBeVisible();
    await signOut.click();
    await expect(page.getByRole('button',{name:/^(?:sign in|login|log in)$/i}).or(page.getByRole('link',{name:/sign in|log in|login/i})).first()).toBeVisible();
    // #53 retained JWT revocation is explicitly outside this ticket.
  });
}

for(const persona of ['visitor','client','admin'] as const) test(`J28-04 ${persona} remaining pages have no retired navigation or replacement activation`,async({page},info)=>{
  if(persona!=='visitor')await signIn(page,accounts()[info.project.name][`${persona}Remaining`]);
  const observations=[];
  for(const path of remainingPages){
    await page.goto(path);
    // Wait for the destination to render, including slow admission redirects.
    await expect(page.getByRole('heading').first()).toBeVisible({timeout:45000});
    // LR L40-L59 and AC3. Admin/RAG admission defects are reported to #74 separately.
    await expect.soft(page.getByRole('link',{name:/workspace|tasks|playground/i}),oracle.replacement).toHaveCount(0);
    observations.push({path,url:page.url(),headings:await page.getByRole('heading').allTextContents(),links:await page.getByRole('link').allTextContents()});
    await page.screenshot({path:test.info().outputPath(`remaining-${path.replaceAll('/','_')||'landing'}.png`),fullPage:true});
  }
  await test.info().attach('remaining-pages.json',{body:JSON.stringify(observations,null,2),contentType:'application/json'});
});
