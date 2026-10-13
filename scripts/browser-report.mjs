import fs from 'node:fs/promises';
const input=JSON.parse(await fs.readFile('.local/browser-results.json','utf8'));
const collect=s=>[...(s.specs||[]).map(spec=>({name:spec.title,passed:spec.ok,attempts:spec.tests.flatMap(t=>t.results).map(r=>({status:r.status,duration_ms:r.duration}))})),...(s.suites||[]).flatMap(collect)];
const results=input.suites.flatMap(collect);
const report={evaluated_at:input.stats.startTime,scope:'Public deployment browser flows: local uploads, tampering, source changes, expired/withdrawn reviews, provider outage recovery, current re-evaluation, mobile/theme and read-only API. Controlled outage responses are browser-local test simulations.',url:process.env.PASSPORT_BASE_URL||'http://127.0.0.1:8791',passed:results.filter(r=>r.passed).length,total:results.length,results};
await fs.writeFile('apps/web/public/data/browser-evaluation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,url:report.url}));
