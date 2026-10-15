import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';

// Run using npm exec --yes --package lighthouse@13.5.0 -- node scripts/mobile-performance.mjs baseline
// Then deploy the candidate and run the same command with `final`.
const phase=process.argv[2];
if(!['baseline','final'].includes(phase))throw new Error('Choose baseline or final.');
const origin=process.env.PASSPORT_BASE_URL||'https://arkivgraph.ajnasnb.com';
if(new URL(origin).hostname!=='arkivgraph.ajnasnb.com'&&!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw new Error('This harness is limited to the owned app or localhost.');
const out=path.resolve('.local/mobile-performance');
await fs.mkdir(out,{recursive:true});
async function lighthousePath(){
  if(process.env.LIGHTHOUSE_MODULE)return process.env.LIGHTHOUSE_MODULE;
  try{return createRequire(import.meta.url).resolve('lighthouse');}catch{}
  for(const entry of (process.env.PATH||'').split(path.delimiter)){
    const candidate=path.resolve(entry,'../lighthouse/core/index.js');
    try{await fs.access(candidate);return candidate;}catch{}
  }
  throw new Error('Run with npm exec --package lighthouse@13.5.0 or set LIGHTHOUSE_MODULE to its core/index.js.');
}
const modulePath=await lighthousePath();
const installed=JSON.parse(await fs.readFile(path.resolve(modulePath,'../../package.json'),'utf8'));
if(installed.version!=='13.5.0')throw new Error('This report pins Lighthouse 13.5.0 for repeatability.');
const {default:lighthouse}=await import(pathToFileURL(modulePath).href);
const chromePath=process.env.PASSPORT_CHROME_PATH||process.env.CHROME_PATH||(os.platform()==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
const routes=[{id:'overview',path:'/'},{id:'context',path:'/?view=context'},{id:'two-client',path:'/two-client/'}];
const metrics=['first-contentful-paint','largest-contentful-paint','speed-index','total-blocking-time','cumulative-layout-shift'];
function median(values){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];}
async function freePort(){const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
const runs=[];
for(const route of routes){
 for(let sample=1;sample<=3;sample++){
  const port=await freePort();
  const browser=await chromium.launch({headless:true,executablePath:chromePath,args:[`--remote-debugging-port=${port}`]});
  try{
   const result=await lighthouse(new URL(route.path,origin).href,{port,logLevel:'error',output:'json',onlyCategories:['performance'],formFactor:'mobile',throttlingMethod:'simulate',disableStorageReset:false});
   if(!result||result.lhr.runtimeError)throw new Error(result?.lhr.runtimeError?.message||'Lighthouse returned no result.');
   const r=result.lhr;
   await fs.writeFile(path.join(out,`${phase}-${route.id}-${sample}.json`),JSON.stringify(r));
   const resources=r.audits['resource-summary'].details.items;
   const value={route:route.id,path:route.path,sample,fetched_at:r.fetchTime,score:Math.round(r.categories.performance.score*100),metrics:Object.fromEntries(metrics.map(key=>[key,r.audits[key].numericValue])),script_transfer_bytes:resources.find(item=>item.resourceType==='script')?.transferSize??0,total_transfer_bytes:resources.find(item=>item.resourceType==='total')?.transferSize??0,script_requests:resources.find(item=>item.resourceType==='script')?.requestCount??0,unused_javascript_bytes:r.audits['unused-javascript'].details?.overallSavingsBytes??0,warnings:r.runWarnings,chrome:r.environment.hostUserAgent,benchmark_index:r.environment.benchmarkIndex,config:r.configSettings};
   runs.push(value);
   await fs.writeFile(path.join(out,`${phase}.json`),JSON.stringify({phase,origin,complete:false,runs},null,2)+'\n');
   console.log(`${phase} ${route.id} ${sample}/3: score ${value.score}; LCP ${Math.round(value.metrics['largest-contentful-paint'])}ms; TBT ${Math.round(value.metrics['total-blocking-time'])}ms; CLS ${value.metrics['cumulative-layout-shift'].toFixed(3)}`);
  }finally{await browser.close();}
 }
}
const grouped=routes.map(route=>{const subset=runs.filter(run=>run.route===route.id);return {route:route.id,path:route.path,samples:subset.length,median:{score:median(subset.map(r=>r.score)),...Object.fromEntries(metrics.map(key=>[key,median(subset.map(r=>r.metrics[key]))])),script_transfer_bytes:median(subset.map(r=>r.script_transfer_bytes)),total_transfer_bytes:median(subset.map(r=>r.total_transfer_bytes)),script_requests:median(subset.map(r=>r.script_requests))},range:{lcp_ms:[Math.min(...subset.map(r=>r.metrics['largest-contentful-paint'])),Math.max(...subset.map(r=>r.metrics['largest-contentful-paint']))],score:[Math.min(...subset.map(r=>r.score)),Math.max(...subset.map(r=>r.score))]},runs:subset};});
const report={phase,origin,complete:true,measured_at:new Date().toISOString(),tool:{name:'Lighthouse',version:installed.version,driver:'Playwright launches a fresh installed Chrome profile for each run; Lighthouse connects through local CDP',node:process.version,platform:os.platform(),cpu:os.cpus()[0]?.model,logical_cpus:os.cpus().length},routes:grouped};
await fs.writeFile(path.join(out,`${phase}.json`),JSON.stringify(report,null,2)+'\n');
if(phase==='final'){
 const baseline=JSON.parse(await fs.readFile(path.join(out,'baseline.json'),'utf8'));
 if(!baseline.complete||baseline.routes?.length!==routes.length)throw new Error('Complete the baseline first; failed/incomplete runs are never published.');
 const evidence={schema:'arkiv-graph.mobile-performance.v1',measured_at:report.measured_at,status:'measured',scope:'Project-run cold-load mobile lab audit of the hosted app; three fresh Chrome profiles per route and release',sample_count:18,configuration:{tool:'Lighthouse 13.5.0',form_factor:'mobile',viewport_css_px:{width:412,height:823},device_scale_factor:1.75,throttling_method:'simulate',cpu_slowdown_multiplier:4,rtt_ms:150,throughput_kbps:1638.4,cache:'Fresh browser profile per run; Lighthouse storage reset enabled',aggregation:'Median of 3 runs per metric, not one selected best run',harness:'scripts/mobile-performance.mjs',reproduce:'npm exec --yes --package lighthouse@13.5.0 -- node scripts/mobile-performance.mjs baseline; deploy candidate; repeat with final'},changes:['Load AI, graph and two-client route code only when that workspace is opened.','Start live admission records and WebSocket subscriptions only for verification views.','Render static pages before the artifact catalog loads.','Force production React and JSX output even when the calling shell exports NODE_ENV=development.','Verify historical session signatures in a dedicated worker; retain all checks and refuse worker errors/timeouts.','Defer the live two-client verifier until an actual request.','Preload the critical font, reserve loading space and keep mobile hero actions in stable rows.','Load the launch-video element and poster only after its disclosure is opened.'],limitations:['These are simulated mobile lab measurements on a Windows desktop, not tests on a physical low-end phone.','No field Core Web Vitals, real-user percentile or INP claim is made. TBT is a lab responsiveness proxy and is not INP.','Lighthouse scores and timings vary with desktop load, network, CDN and browser versions.','The two-client route verifies historical signed snapshots in a worker; cold-load latency is not solely an initial-bundle measurement.','This navigation audit does not measure the responsiveness of every later click or live verification request.','Lighthouse resource-summary undercounts dedicated-worker transfer in this Chrome run. Its byte fields are reported audit values; use the worker-free Overview route for the documented transfer comparison.','Main-thread paint/TBT metrics do not assert that background historical verification has finished at first paint.'],sources:[{title:'Web Vitals: lab and field measurements',url:'https://web.dev/articles/vitals'},{title:'Lighthouse performance scoring and variability',url:'https://developer.chrome.com/docs/lighthouse/performance/performance-scoring'}],baseline,final:report};
 await fs.writeFile('apps/web/public/data/mobile-performance.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('Published apps/web/public/data/mobile-performance.json');
}
