import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:['**/foundation.spec.ts','**/mission.spec.ts'],workers:1,timeout:420000,expect:{timeout:45000},reporter:'list',outputDir:'.cache/chapter-regression-results',
  use:{baseURL:'http://127.0.0.1:5187',channel:'chrome',launchOptions:{args:[]},viewport:{width:1440,height:900},video:{mode:'on',size:{width:1440,height:900}}},
  projects:[{name:'mission-webgpu'}],
  webServer:{command:'npm run dev -- --port 5187 --strictPort',url:'http://127.0.0.1:5187',reuseExistingServer:false},
});
