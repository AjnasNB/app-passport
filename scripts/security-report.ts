import fs from 'node:fs/promises';
const result=JSON.parse(await fs.readFile('.local/vitest-results.json','utf8'));
const cases=result.testResults.flatMap((r:any)=>r.assertionResults.map((a:any)=>({name:a.fullName,passed:a.status==='passed',duration_ms:a.duration})));
await fs.writeFile('apps/web/public/data/security-evaluation.json',JSON.stringify({evaluated_at:new Date().toISOString(),scope:'Signed artifacts, policy, graph manifests and traversal, Qarinah source bindings, withdrawal/expiry, hostile JSON, deterministic tools, bounded media byte ranges and AI orchestration with mock inference. Project-run tests, not an independent audit.',passed:cases.filter((c:any)=>c.passed).length,total:cases.length,results:cases},null,2)+'\n');
console.log(JSON.stringify({passed:cases.filter((c:any)=>c.passed).length,total:cases.length}));
