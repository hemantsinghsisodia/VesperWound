import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:'**/paving.spec.ts',workers:1,timeout:180000,expect:{timeout:30000},reporter:'list',
  outputDir:'.cache/paving-browser-results',
  use:{baseURL:'http://127.0.0.1:5182',channel:'chrome',launchOptions:{args:[]}},
  projects:[
    {name:'paving-webgpu',use:{viewport:{width:1440,height:900}}},
    {name:'paving-webgl2',use:{viewport:{width:1440,height:900}}},
    {name:'paving-mobile',use:{...devices['Pixel 7'],viewport:{width:915,height:412}}},
  ],
  webServer:{command:'npm run dev -- --port 5182 --strictPort',url:'http://127.0.0.1:5182',reuseExistingServer:true},
});
