import fs from 'node:fs/promises';
const paths=process.argv.slice(2);
const inputs=await Promise.all((paths.length?paths:['.local/browser-results.json']).map(async path=>JSON.parse(await fs.readFile(path,'utf8'))));
const collect=s=>[...(s.specs||[]).map(spec=>({name:spec.title,passed:spec.ok,attempts:spec.tests.flatMap(t=>t.results).map(r=>({status:r.status,duration_ms:r.duration}))})),...(s.suites||[]).flatMap(collect)];
const results=inputs.flatMap(input=>input.suites.flatMap(collect));
if(new Set(results.map(r=>r.name)).size!==results.length)throw new Error('Duplicate browser checks in merged runs');
const report={evaluated_at:inputs.at(-1).stats.startTime,evaluation_runs:inputs.map(input=>({started_at:input.stats.startTime,duration_ms:input.stats.duration})),scope:'Public deployment browser flows: graph switching, source-byte verified context, bounded export, hosted coding inference, local uploads, tampering, source changes, expired/withdrawn reviews, provider outage recovery, current re-evaluation, mobile/theme, migration, read-only API, launch video playback and downloads. Controlled outage responses are browser-local test simulations.',url:process.env.PASSPORT_BASE_URL||'http://127.0.0.1:8791',passed:results.filter(r=>r.passed).length,total:results.length,results};
await fs.writeFile('apps/web/public/data/browser-evaluation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,url:report.url}));
