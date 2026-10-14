import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:'**/mission.spec.ts',workers:1,timeout:420000,expect:{timeout:45000},reporter:'list',outputDir:'.cache/mission-browser-results',
  use:{baseURL:'http://127.0.0.1:5182',channel:'chrome',launchOptions:{args:[]},video:{mode:'on',size:{width:1440,height:900}}},
  projects:[
    {name:'mission-webgpu',use:{viewport:{width:1440,height:900}}},
    {name:'mission-webgl2',use:{viewport:{width:1440,height:900}}},
    {name:'mission-mobile',use:{...devices['Pixel 7'],viewport:{width:915,height:412}}},
  ],
  webServer:{command:'npm run dev -- --port 5182 --strictPort',url:'http://127.0.0.1:5182',reuseExistingServer:true},
});
