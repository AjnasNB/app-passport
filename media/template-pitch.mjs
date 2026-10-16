import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

// Editable pitch with conceptual artwork kept separate from measured evidence.
const root = process.cwd();
const build = path.resolve(root, process.argv[2] || '.local/template-refresh/deck-r1');
const runtime = process.env.ARTIFACT_NODE_MODULES;
const python = process.env.ARTIFACT_PYTHON;
const skill = process.env.ARTIFACT_PRESENTATIONS_SKILL;
if (!runtime || !python || !skill) throw new Error('Use the bundled presentation runtime.');
process.env.RUNTIME_NODE_MODULES = runtime;
await fs.mkdir(path.join(build, 'final'), {recursive: true});
const req = createRequire(path.join(runtime, 'presentation-font.cjs'));
req('@napi-rs/canvas').GlobalFonts.registerFromPath(path.join(root, 'apps/web/public/fonts/dm-sans-latin.woff2'), 'DM Sans');
const {Presentation, PresentationFile} = await import(pathToFileURL(path.join(runtime, '@oai/artifact-tool/dist/artifact_tool.mjs')));
const {finalizePresentation, applyPresentationChartFont} = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')));
const p = Presentation.create({slideSize: {width: 1920, height: 1080}});
const C = {black:'#030405', white:'#F7F7F5', muted:'#B7BDC7', blue:'#7FB8F4', amber:'#E2B777', line:'#344250'};
const site='https://arkivgraph.ajnasnb.com', repo='https://github.com/AjnasNB/arkiv-graph';
const read = async n => JSON.parse(await fs.readFile(path.join(root,'apps/web/public/data',n+'.json'),'utf8'));
const [mobile, security, safeguards, npmUsage, publication] = await Promise.all(['mobile-performance','security-evaluation','trust-safeguards','npm-usage','root-update-publication'].map(read));
if (security.passed !== 271 || safeguards.passed !== 19 || mobile.sample_count !== 18 || publication.entities !== 8) throw new Error('Evidence snapshot changed: review pitch claims.');
if (!npmUsage.packages.every(x=>x.registry.expected_version_is_latest)) throw new Error('Unverified package version.');
const ledger=[];
const text=(s,v,x,y,w,h,z=36,c=C.white,b=false)=>{
  const sh=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  sh.text=v; sh.text.insets=0; sh.text.style={typeface:'DM Sans',fontSize:z,color:c,bold:b}; return sh;
};
const rect=(s,x,y,w,h,fill=C.black,line='none',lw=0)=>s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill,line:{fill:line,width:lw}});
const rule=(s,x,y,w,c=C.line)=>rect(s,x,y,w,2,c);
const image=async(s,file,x,y,w,h,alt,fit='contain')=>{
  const b=await fs.readFile(file);s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt,fit,position:{left:x,top:y,width:w,height:h}});
};
async function slide(key,notes,art){
  const s=p.slides.add();s.background.fill=C.black;
  if(art) await image(s,path.join(root,'apps/web/public/brand/arkiv-graph/pitch-dark',art+'.png'),0,0,1920,1080,'Generated conceptual illustration; not a screenshot, measurement or deployment','cover');
  text(s,'ARKIV GRAPH',110,76,700,38,25,C.white);
  text(s,String(p.slides.items.length).padStart(2,'0')+' / 08',1690,76,120,38,24,C.muted);
  text(s,'I built this · Ajnas NB',110,1002,700,38,24,C.muted);
  text(s,'arkivgraph.ajnasnb.com',1370,1002,445,38,24,C.muted);
  s.speakerNotes.text=notes+(art?' Generated conceptual artwork: '+art+'.':'');
  ledger.push({slide:p.slides.items.length,key,notes,art:art?`/brand/arkiv-graph/pitch-dark/${art}.png`:null});return s;
}
const title=(s,v,w=1680)=>text(s,v,110,166,w,155,86);

let s=await slide('introduction',`Arkiv Graph is reusable MIT TypeScript infrastructure layered on Arkiv's public indexed entities. It supplies signed graph membership, bounded local traversal, root updates, CLI and stdio MCP. AI Passport is its reference app, not the infrastructure's only use case. Audience: AI-tool developers and security reviewers who need connected public evidence and reader-controlled acceptance. There is no native Arkiv graph query engine or custom contract deployment. Builder Ajnas NB. Source ${repo}; live ${site}.`,'cover-soft');
text(s,'ARKIV\nGRAPH',110,265,930,345,151);
text(s,'Connected evidence\nfor AI tools',115,672,885,145,55);
text(s,'MIT TypeScript SDK  /  CLI  /  MCP',115,866,1050,60,31,C.blue);
text(s,'AI Passport: the working reference app',115,929,1120,45,29,C.muted);

s=await slide('problem',`A copied approval can remain in circulation after a reviewer withdraws it. The affected user is an AI-tool builder or reviewer handing source/context across tools; a fresh task must check current accepted evidence, not reuse an old screenshot or cached allowance. A hash binds bytes but does not discover related authors, reviews or withdrawals. This is a demonstrated failure mode, not a quantified market-incidence claim. Actual controlled session ${site}/data/two-client-session.json. Public/synthetic context only. No private Qarinah memory is published.`,'problem');
title(s,'The problem');
text(s,'A copied approval\ncan outlive its review',110,350,900,170,63);
text(s,'AI-tool builders and security reviewers',110,568,920,65,31,C.blue);
text(s,'Bytes match.\nIs permission still current?',110,704,850,135,43,C.muted);
text(s,'Hashes identify content. They do not discover current reviews.',110,906,1580,60,31);

s=await slide('solution-and-schema',`The SDK models arkiv.graph.v1 nodes and edges and publishes typed indexed node, edge and complete signed manifest entities. Example semantic path: context -> source via cites, context -> tool via uses. On-chain indexed fields include namespace, schema_version, kind, graph_hash and typed node/edge identifiers; creator is protocol metadata. The manifest enumerates the complete signed revision and finite validity; incomplete membership fails before traversal. Arkiv stores/discovers indexed attributable entities. SDK assembles/verifies/traverses locally. AI Passport checks review state and exact source bytes before a hosted model request. Private memory, full source storage and inference remain off-chain. Schema ${repo}/blob/main/arkiv/schema.md; source ${repo}/tree/main/packages/arkiv-graph. Root registry has14-day signed validity/30-day storage; policies/lifetimes vary by record type.`);
title(s,'The graph layer');
text(s,'Typed nodes + directed edges + a complete signed manifest',110,320,1700,66,38,C.blue);
// Native, editable semantic graph and layer diagram. Connectors are kept away from labels.
rect(s,110,459,410,122,'#0C1723',C.blue,2);text(s,'Source',145,483,340,65,43);
rect(s,708,459,410,122,'#0C1723',C.blue,2);text(s,'Context',743,483,340,65,43);
rect(s,1305,459,410,122,'#1B1711',C.amber,2);text(s,'Tool',1340,483,340,65,43);
rule(s,521,522,187,C.blue);text(s,'← cites',548,466,150,45,28,C.muted);
rule(s,1119,522,186,C.amber);text(s,'uses →',1146,466,170,45,28,C.muted);
text(s,'Node: id · type · digest     Edge: from · to · relation',110,611,1660,45,29,C.muted);
text(s,'Manifest: every member + signature + deadline',110,659,1660,42,27,C.muted);
rule(s,110,718,1700);
text(s,'ARKIV',110,761,475,55,32,C.blue);text(s,'Indexed public entities\nCreator + expiry + queries',110,837,500,100,31);
text(s,'GRAPH SDK',710,761,475,55,32,C.blue);text(s,'Signed membership\nBounded local traversal',710,837,500,100,31);
text(s,'AI PASSPORT',1305,761,500,55,32,C.amber);text(s,'Review admission\nContext + source checks',1305,837,500,100,31);

s=await slide('innovation',`Actual root-update evidence: two authority-signed revisions,8readonly entities,1atomic Tiramisu transaction at block${publication.confirmed_block}. This is a separate small synthetic graph, not migration of the larger AI reference root. Reader pins authority/chain/profile/policy/genesis, checks linked sequence/deadline and rejects rollback/forks relative to a retained checkpoint. Exact transaction ${publication.tx_url}. Actual withdrawal: review at603792, accepted requests A603794/B603795; withdrawal603917; B refuses603919 and A603920. Both consumers and signing wallets are project-operated. Current browser button makes fresh reads of this completed session, not another publication. Retained authentic pending-target withdrawals, persistence before admission and full-request same-origin Web Locks fail closed on storage/lock failures. No instant cancellation of already-running tasks. ${site}/data/trust-safeguards.json and ${site}/data/two-client-session.json.`,'innovation');
title(s,'Current evidence, each request');
text(s,'Authenticated root updates',110,354,1040,70,46);
text(s,'2 signed revisions · 8 entities · 1 transaction',110,441,1110,60,32,C.blue);
text(s,'Review withdrawal',110,585,910,70,46);
text(s,'A accepts     B accepts',110,676,850,60,37,C.blue);
text(s,'Withdrawal observed',110,747,850,60,37,C.amber);
text(s,'B refuses     A refuses',110,818,850,60,37);
text(s,'Actual project-run transactions. Retained history protects subsequent requests.',110,925,1670,48,28,C.muted);

s=await slide('service-and-use-cases',`Reusable service: MIT SDK, CLI and stdio MCP for graph verification/traversal/context extraction; no separate paid SaaS or token product is claimed. AI Passport is a real reference app using selected Qarinah context and exact source binding. Hosted model @cf/meta/llama-3.2-3b-instruct. Coding handoff checks review before inference and interprets a finite guard spec in six tests; generated JavaScript is not executed. India number tutor uses exact deterministic paise/lakh/crore and English/Hindi. UPI Safety Quest uses project-authored NPCI-linked summaries, deterministic scoring and optional AI coaching; no payments/PIN. Target Indian learners and AI-tool builders; no outside users/outcomes established. Capture is actual hosted UI from the prior recorded test, not generated. ${site}/?view=handoff ; ${site}/data/ai-evaluation.json. Source originality/reuse disclosure ${repo}/blob/main/README.md.`,'usecases');
title(s,'One toolkit. Useful AI tools.');
text(s,'AI Passport reference app',110,326,1130,60,35,C.blue);
text(s,'Coding handoff',110,454,820,64,44);
text(s,'Reviewed context + six guard checks',110,528,920,55,30,C.muted);
text(s,'India number tutor',110,640,920,64,44);
text(s,'Exact paise, lakh/crore · English/Hindi',110,714,920,55,30,C.muted);
text(s,'UPI Safety Quest',110,826,920,64,44);
text(s,'Learn with sourced guidance; no payment flow',110,900,1030,55,29,C.muted);
await image(s,path.join(root,'apps/web/public/brand/arkiv-graph/trust-release/ai-result.png'),1060,385,750,490,'Actual hosted AI Passport reference-app capture; public project-operated demo');
text(s,'Actual AI Passport capture',1070,880,720,42,24,C.muted);

s=await slide('why-arkiv-and-moat',`Why Arkiv: compatible consumers discover the same typed public records with protocol creator metadata and finite storage, without relying on this application API. A single-operator Postgres database is sufficient if only that operator controls readers; replacing Arkiv requires another shared publication/discovery layer, not just hashing local data. IPFS can address immutable bytes but the application still needs indexed creator/review discovery and current-record policy. Another public protocol could implement this; no exclusive technical necessity is claimed. Arkiv Graph brings reusable graph schema, verification, local traversal and context adapters to Arkiv builders. Current defensibility is integration depth, documented contracts and conformance evidence. A community of interoperable producers/readers is a future ecosystem hypothesis, not a proven moat/network effect; no outside adoption or revenue. ${site}/data/backend-independence.json ; ${repo}/blob/main/ARKIV_GRAPH.md . Official Arkiv indexed query docs https://docs.arkiv.network/json-rpc/querying-data/ .`,'moat');
title(s,'Why Arkiv. Why this layer.');
text(s,'Shared, attributable discovery',110,351,1080,70,47);
text(s,'Readers work without my application API',110,441,1100,55,32,C.blue);
text(s,'What Arkiv gains',110,572,1030,65,43);
text(s,'A graph contract, verified reader tooling\nand reusable AI-context adapters',110,651,1060,105,36);
text(s,'Defensibility today',110,800,1050,65,40,C.amber);
text(s,'Integration quality + conformance evidence',110,875,1170,55,31);
text(s,'Ecosystem moat is a hypothesis. One-operator apps can use a normal database.',110,946,1690,39,25,C.muted);

s=await slide('evidence',`Evidence is project-run, not external certification. Security snapshot271localtests;19trust safeguards. Signed generic graph7nodes/8edges/16entities; AI graph27nodes/43edges/71entities. 18simulated mobile Lighthouse13.5desktop Chrome/Windows audits,3coldloads perrouteandphase; baseline87/88/41,final98/98/96. This is historical measured release data, not physical-phone/fieldINP and not a score for subsequent website edits. npm publication verified anonymously: graph0.4.0,passport0.6.0. Official npm download API on${npmUsage.fetched_at} returned404for both7/30-day windows ending2026-10-15. Downloads unavailable, not zero; npm would include project/CI installs and is not users or runtime reads. Actual per-request receipts carry read blocks, but no global SDK/runtime reader telemetry exists. No unaided outside integration established. ${site}/data/npm-usage.json ; ${site}/data/mobile-performance.json ; ${site}/data/security-evaluation.json ; ${site}/data/npm-release.json.`);
title(s,'Evidence, with its limits');
text(s,'271',110,329,350,100,77,C.blue);text(s,'Local tests',115,430,350,50,29,C.muted);
text(s,'19',492,329,290,100,77,C.blue);text(s,'Trust checks',497,430,340,50,29,C.muted);
text(s,'2 public npm releases',1050,344,740,70,40);
text(s,'Download counts unavailable',1050,438,740,58,34,C.amber);
text(s,'npm API: HTTP 404 · 16 Oct 2026',1050,509,740,50,27,C.muted);
const chart=s.charts.add('bar',{name:'mobile-lab-results',position:{left:105,top:549,width:880,height:365},categories:['Overview','Context','Two-client'],series:[{name:'Before',values:mobile.baseline.routes.map(r=>r.median.score),fill:'#50647B'},{name:'After',values:mobile.final.routes.map(r=>r.median.score),fill:C.blue}],barOptions:{direction:'column',grouping:'clustered',gapWidth:100,overlap:0},hasLegend:true,legend:{position:'bottom',textStyle:{fontSize:22,fill:C.muted}},dataLabels:{showValue:true,position:'outEnd',textStyle:{fontSize:26,fill:C.white}},xAxis:{textStyle:{fontSize:24,fill:C.white}},yAxis:{min:0,max:100,majorUnit:25,numberFormatCode:'0',textStyle:{fontSize:21,fill:C.muted},majorGridlines:{fill:'#273543',width:1}},chartFill:'none',chartLine:{fill:'none',width:0},plotAreaFill:'none',plotAreaLine:{fill:'none',width:0}});
applyPresentationChartFont(chart,{fontFamily:'DM Sans'});
text(s,'No global runtime-read counter\nNo outside adoption claim',1050,652,740,111,34,C.muted);
text(s,'98 / 98 / 96 are lab scores',1050,817,750,60,36,C.blue);
text(s,'18 simulated mobile audits · median of 3 per route and phase · historical release',110,939,1700,42,26,C.muted);

s=await slide('get-started',`Graph-only zero-wallet local quickstart: npm init -y; npm install @ajnasnb/arkiv-graph@0.4.0; copy complete graph.mjs from ${repo}/blob/main/docs/GETTING_STARTED.md; node graph.mjs. Fresh anonymous proof node scripts/quickstart-proof.mjs runs exact example outside workspace with fetch disabled, demonstrating schema and local traversal only. Receipt ${site}/data/quickstart-proof.json . Real RPC verification is a separate online step requiring independently reviewed issuer/root/chain/profile policy: npx arkiv-graph verify reader.json; npx arkiv-graph mcp reader.json. Public readers need no wallet; publishing uses free Tiramisu testnet GLM and dedicated signing wallets. No custom contract deployment. Limits: one live RPC operator; eth_getProof -32601; no fresh-reader non-omission proof, clearing history loses rollback/withdrawal observations, root-update demo small/separate, rotation manual, no scale/physical-device/adoption claims. Friction expected-vs-actual reproductions in ${repo}/blob/main/arkiv/friction.md . Official four equal 25-point judging areas and gates https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/docs/scoring-rubric.md . Strongest fit Open Source; Security secondary; working India examples without an adoption claim. Future: independent integrator and a second RPC/provider-completeness strategy.`,'solution');
title(s,'Build with Arkiv Graph');
text(s,'01',110,346,120,65,44,C.blue);text(s,'Install the public SDK',285,346,1400,65,43);
text(s,'npm install @ajnasnb/arkiv-graph@0.4.0',285,431,1450,60,36);
rule(s,110,533,1700);
text(s,'02',110,570,120,65,44,C.blue);text(s,'Run the complete graph.mjs example',285,570,1450,65,43);
text(s,'docs/GETTING_STARTED.md  →  node graph.mjs',285,655,1450,60,35,C.muted);
rule(s,110,757,1700);
text(s,'03',110,791,120,65,44,C.amber);text(s,'Review trust policy, then read Arkiv',285,791,1450,65,43);
text(s,'npx arkiv-graph verify reader.json',285,876,1450,60,36);
text(s,'MIT · arkiv/schema.md · arkiv/friction.md · Wallet-free reads · RPC completeness is trusted',110,953,1700,39,26,C.muted);

for (const [i,sl] of p.slides.items.entries()) {
  const b=await p.export({slide:sl,format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));
  const l=await sl.export({format:'layout'});await fs.writeFile(path.join(build,`slide-${i+1}.layout.json`),await l.text());globalThis.gc?.();
}
const candidate=path.join(build,'candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);
const finalPath=path.join(build,'final/arkiv-graph-pitch.pptx');
await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath,pythonExecutable:python,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','18288000,10287000','--validate-heading-fit','--validate-bullet-geometry'],explicitTotalSlideCount:8,requiredNativeChartOwnerSlides:[7],requiredNativeTableOwnerSlides:[],materializeLiteralChartWorkbooks:true,fontPolicy:{basis:'design',families:['DM Sans']},verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')});
await fs.writeFile(path.join(build,'content-ledger.json'),JSON.stringify({schema:'arkiv-graph.pitch-content.v2',generated_at:new Date().toISOString(),slide_count:8,scope:'Generated conceptual art; editable labels, architecture and measurement chart. Project-run evidence. No outside adoption.',sources:{npm:npmUsage.fetched_at,mobile_samples:mobile.sample_count},slides:ledger},null,2)+'\n');
console.log(JSON.stringify({build,finalPath,slide_count:8,sha256:createHash('sha256').update(await fs.readFile(finalPath)).digest('hex')}));
