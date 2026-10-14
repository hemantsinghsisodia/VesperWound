import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:'**/armed-motion.spec.ts',workers:1,timeout:180000,expect:{timeout:30000},reporter:'list',
  outputDir:'.cache/armed-motion-results',
  use:{baseURL:'http://127.0.0.1:5182',channel:'chrome',launchOptions:{args:[]},video:{mode:'on',size:{width:1440,height:900}}},
  projects:[
    {name:'armed-webgpu',use:{viewport:{width:1440,height:900}}},
    {name:'armed-webgl2',use:{viewport:{width:1440,height:900}}},
    {name:'armed-mobile',use:{...devices['Pixel 7'],viewport:{width:915,height:412}}},
  ],
  webServer:{command:'npm run dev -- --port 5182 --strictPort',url:'http://127.0.0.1:5182',reuseExistingServer:false},
});
