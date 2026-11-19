import { defineConfig } from '@playwright/test';
import path from 'node:path';
const evidence = process.env.QA_EVIDENCE;
if (!evidence || !process.env.QA_URL) throw new Error('Set QA_EVIDENCE and QA_URL');
export default defineConfig({
  testDir: '.', testMatch: /journeys\.spec\.ts/, fullyParallel: false, workers: 1,
  retries: 0, timeout: 180000, expect: {timeout: 15000},
  outputDir: path.join(evidence, 'artifacts'),
  reporter: [['line'],['json',{outputFile:path.join(evidence,'results.json')}]],
  use: {baseURL: process.env.QA_URL, browserName:'chromium', colorScheme:'light',
    trace:'on',video:'on',screenshot:'on',actionTimeout:15000,navigationTimeout:30000},
  projects: [
    {name:'desktop',use:{viewport:{width:1440,height:900}}},
    {name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  ],
});
