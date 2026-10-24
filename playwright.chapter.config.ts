import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:'**/chapter.spec.ts',workers:1,timeout:420000,expect:{timeout:45000},reporter:'list',outputDir:'.cache/chapter-browser-results',
  use:{baseURL:'http://127.0.0.1:5186',channel:'chrome',launchOptions:{args:[]},video:{mode:'on',size:{width:1440,height:900}}},
  projects:[{name:'chapter-webgpu',use:{viewport:{width:1440,height:900}}},{name:'chapter-webgl2',use:{viewport:{width:1440,height:900}}},{name:'chapter-mobile',use:{...devices['Pixel 7'],viewport:{width:915,height:412}}}],
  webServer:{command:'npm run dev -- --port 5186 --strictPort',url:'http://127.0.0.1:5186',reuseExistingServer:false},
});
