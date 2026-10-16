import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const root=process.cwd(),build=path.resolve(root,process.argv[2]||'.local/editorial-pitch/r1');
const runtime=process.env.ARTIFACT_NODE_MODULES,python=process.env.ARTIFACT_PYTHON,skill=process.env.ARTIFACT_PRESENTATIONS_SKILL;
if(!runtime||!python||!skill)throw new Error('Use the bundled presentation runtime.');
process.env.RUNTIME_NODE_MODULES=runtime;
await fs.mkdir(path.join(build,'final'),{recursive:true});
const req=createRequire(path.join(runtime,'editorial-fonts.cjs'));
const fonts=req('@napi-rs/canvas').GlobalFonts;
for(const [file,family]of [['C:/Windows/Fonts/arial.ttf','Arial'],['C:/Windows/Fonts/georgia.ttf','Georgia'],['C:/Windows/Fonts/consola.ttf','Consolas']])fonts.registerFromPath(file,family);
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime,'@oai/artifact-tool/dist/artifact_tool.mjs')));
const {finalizePresentation,applyPresentationChartFont}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const p=Presentation.create({slideSize:{width:1920,height:1080}});
const C={paper:'#F6F4EE',ink:'#17372E',green:'#225B4B',muted:'#63716B',rust:'#C25535',line:'#C6CCC5',white:'#F9F8F3',pale:'#E2EBE2'};
const site='https://arkivgraph.ajnasnb.com',repo='https://github.com/AjnasNB/arkiv-graph',ledger=[];
const release={graph:'0.4.1',passport:'0.6.1',published:process.env.ARKIV_PITCH_RELEASE_STATUS!=='pending'};
const data=async n=>JSON.parse(await fs.readFile(path.join(root,'apps/web/public/data',n+'.json'),'utf8'));
const [mobile,security,safeguards,usage]=await Promise.all(['mobile-performance','security-evaluation','trust-safeguards','npm-usage'].map(data));
const localTestCount=274;
if(![271,localTestCount].includes(security.passed)||safeguards.passed!==19||mobile.sample_count!==18)throw new Error('Review changed evidence before authoring.');
const T=(s,v,x,y,w,h,size=34,color=C.ink,font='Arial',bold=false)=>{const sh=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});sh.text=v;sh.text.insets=0;sh.text.style={typeface:font,fontSize:size,color,bold};return sh;};
const R=(s,x,y,w,h,fill,line='none',width=0)=>s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill,line:{fill:line,width}});
const L=(s,x,y,w,color=C.line)=>R(s,x,y,w,2,color);
async function I(s,file,x,y,w,h,alt,crop){const b=await fs.readFile(file);s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt,fit:'contain',position:{left:x,top:y,width:w,height:h},...(crop?{crop}:{})});}
function S(key,section,notes,dark=false){const s=p.slides.add();s.background.fill=dark?C.ink:C.paper;T(s,section.toUpperCase(),100,62,1470,40,24,dark?'#B3C9BD':C.muted);T(s,String(p.slides.items.length).padStart(2,'0'),1730,62,90,40,24,dark?'#B3C9BD':C.muted);L(s,100,985,1720,dark?'#466254':C.line);T(s,'Arkiv Graph',100,1009,700,37,23,dark?C.white:C.ink);T(s,'Ajnas NB',1580,1009,240,37,23,dark?'#B3C9BD':C.muted);s.speakerNotes.text=notes;ledger.push({slide:p.slides.items.length,key,notes});return s;}
const H=(s,v,dark=false,w=1700)=>T(s,v,100,145,w,160,73,dark?C.white:C.ink,'Georgia');
const art=path.join(root,'apps/web/public/brand/arkiv-graph/editorial');

let s=S('introduction','Arkiv Graph / October 2026',`I built Arkiv Graph, an MIT TypeScript SDK layered on Arkiv's indexed public entities. AI Passport is the working reference application. It combines selected Qarinah context, source-byte checks and current review admission before a task. The SDK also supplies CLI and stdio MCP readers. The image is an actual capture of the owned public website, not a generated mockup. Source ${repo}.` ,true);
T(s,'Arkiv Graph',100,186,1700,172,128,C.white,'Georgia');
T(s,'Evidence graphs\nfor AI tools',100,439,655,172,60,C.white);
T(s,'A reusable SDK on Arkiv.\nAI Passport is the reference app.',104,664,640,122,34,'#C4D8CD');
T(s,'MIT TypeScript SDK\nCLI and MCP readers',104,852,630,91,31,'#C4D8CD');
await I(s,path.join(art,'website.png'),790,422,1030,460,'Actual Arkiv Graph website hero; its evidence path is labelled illustrative in the interface');
T(s,'Live product: arkivgraph.ajnasnb.com',790,908,1030,48,29,C.white);

s=S('problem','The problem',`An AI tool developer needs a fresh review decision before the next task. A coding client receives a reviewed context packet. If the reviewer later withdraws that review, a cached approval can be stale even when the packet's content hash is unchanged. A later client must retrieve and evaluate current evidence before starting the next task. The example is the project-operated session in ${site}/data/two-client-session.json, not a quantified claim about customer incidents.`);
H(s,'The file is unchanged.\nThe review has been withdrawn.');
T(s,'AI tool developers need a fresh review decision before the next task.',105,340,1640,70,40,C.muted);
T(s,'Approved',105,482,710,128,88,C.green,'Georgia');
T(s,'Withdrawn',1020,482,790,128,88,C.rust,'Georgia');
L(s,105,657,1700);
T(s,'The handoff',105,708,480,60,32,C.green,undefined,true);
T(s,'A reviewed packet is copied\ninto another coding tool.',105,790,490,112,35);
T(s,'The change',700,708,480,60,32,C.green,undefined,true);
T(s,'The reviewer withdraws\nthat exact review.',700,790,490,112,35);
T(s,'The decision',1295,708,500,60,32,C.green,undefined,true);
T(s,'The next request checks\nthe current evidence again.',1295,790,510,112,35);

s=S('architecture','The infrastructure',`Arkiv stores and discovers typed indexed node, edge, manifest and root-registry records, with protocol creator metadata and finite expiry. The SDK reconstructs a complete selected revision, verifies signatures and accepted creators, then traverses locally under budgets. AI Passport adds review admission and source-byte verification. Private Qarinah memory and inference stay off-chain. Manifest membership is not a proof that the RPC exposed every newer revision. Schema ${repo}/blob/main/arkiv/schema.md. Architecture ${repo}/blob/main/ARCHITECTURE.md.`);
H(s,'Arkiv storage. Local graph readers.');
T(s,'Shared public records',105,340,520,60,37,C.green,undefined,true);
T(s,'Arkiv Graph SDK',710,340,520,60,37,C.green,undefined,true);
T(s,'AI Passport',1315,340,500,60,37,C.green,undefined,true);
R(s,105,447,495,282,'#E5EBE3',C.line,1);T(s,'Node\nEdge\nSigned manifest',138,478,430,180,42);
T(s,'Indexed by graph_hash and kind\nFiltered by on-chain creator',105,763,520,112,30,C.muted);
T(s,'→',622,523,80,80,58,C.muted);
R(s,710,447,495,282,C.ink);T(s,'Verify authorship\nReconstruct membership\nTraverse under a budget',741,480,440,195,34,C.white);
T(s,'Optional root registry verifies\nlinked updates and checkpoints',710,763,530,112,30,C.muted);
T(s,'→',1228,523,80,80,58,C.muted);
R(s,1315,447,495,282,'#E5EBE3',C.line,1);T(s,'Check current review\nMatch source bytes\nUse selected AI context',1346,480,440,195,34);
T(s,'Private memory and inference\nstay off-chain',1315,763,500,112,30,C.muted);
L(s,105,891,1700);
T(s,'Node: id, type, digest     Edge: from, to, relation     Manifest: complete member digests',105,916,1700,46,28,C.ink,'Consolas');

s=S('withdrawal','The working demonstration',`Two project-operated clients and two project-controlled signing wallets demonstrate a real Tiramisu review withdrawal. In the recorded operator lifecycle, A admitted at603794 and B at603795. Review withdrawal was at603917. B refused its next request at603919 and A at603920. The screenshots are fresh requests for the same already-withdrawn session, not a re-publication or before-state simulation. Both refuse and run no task. This deterministic flow does not use an LLM. The separate root-update experiment published two revisions and six graph records in one atomic transaction:8entities,block608212. It does not migrate the larger AI reference root. ${site}/data/two-client-session.json ; ${site}/data/root-update-publication.json.`);
H(s,'Two clients reject a withdrawn review');
T(s,'Recorded lifecycle',105,323,520,50,30,C.green,undefined,true);
T(s,'A accepted 603794\nB accepted 603795',105,400,520,115,38);
T(s,'Review withdrawn\nat block 603917',705,400,530,115,38,C.rust);
T(s,'A refused 603920\nB refused 603919',1305,400,510,115,38);
L(s,105,553,1700);
await I(s,path.join(art,'client-A.png'),105,588,815,300,'Actual current browser result for client A; cropped to header and refusal outcome');
await I(s,path.join(art,'client-B.png'),1000,588,815,300,'Actual current browser result for client B; cropped to header and refusal outcome');
T(s,'Fresh reads of the completed session. Both clients and wallets are project-operated.',105,904,1710,43,27,C.muted);
T(s,'Separate root-update test: 2 signed revisions, 8 entities, 1 transaction.',105,948,1710,34,25,C.muted);

s=S('reference-application','The reference application',`AI Passport checks the context review before hosted inference using @cf/meta/llama-3.2-3b-instruct. The coding flow links selected Qarinah context to exact source bytes, interprets a finite guard specification and passes six boundary cases. Generated JavaScript is exported for inspection and is not executed. The screenshot is the recorded 15 October coding run, run ID 351a5039-ff2e-403d-abfc-5363e4120e98, documented in ${site}/data/launch-capture-evidence.json. The separate eight-case report is ${site}/data/ai-evaluation.json. India number tutor calculates deterministic exact paise/lakh/crore in English/Hindi. UPI Safety Quest uses project-authored NPCI-linked learning material, deterministic scoring and an optional AI coach. No payment or outside adoption is claimed. ${site}/?view=handoff.`);
H(s,'AI Passport checks context before inference');
T(s,'A coding handoff',105,331,600,65,43,C.green,undefined,true);
T(s,'Qarinah context links to\nthe exact source version.\nA current review admits the task.',105,431,610,182,35);
T(s,'Six guard cases passed',105,676,630,70,43,C.green,'Georgia');
T(s,'India tools teach exact paise,\nlakh/crore and UPI safety\nin English and Hindi.',105,776,610,147,31,C.muted);
await I(s,path.join(root,'apps/web/public/brand/arkiv-graph/trust-release/ai-result.png'),930,325,830,596,'Actual recorded AI Passport coding result; native crop isolates the complete six-case result panel',{left:0.48,top:0,right:0,bottom:0.105});
T(s,'Recorded AI result, 15 Oct 2026',930,946,830,34,25,C.muted);


s=S('why-arkiv','Why Arkiv / What I add',`The value used here is shared public indexed discovery outside the originating application API. In a controlled in-process fetch fault-injection test, an isolated clean npm consumer rejects project API requests while reading both pinned graphs through Arkiv RPC, checking source bytes and refusing the withdrawn session. This is not an actual website outage, OS firewall or network sandbox. A private database can implement the same local graph and verification protocol, but another public discovery layer is needed to preserve cross-application access when the originating API is unavailable. IPFS distributes content-addressed bytes and still needs indexed review/creator discovery. Another public protocol could supply similar properties. Arkiv Graph contributes versioned schema, signed manifest, bounded readers, trust-state handling and CLI/MCP integration. These are present integration advantages. Independent adoption and an ecosystem moat remain unproven. ${site}/data/backend-independence.json ; ${repo}/blob/main/ARKIV_GRAPH.md.`);
H(s,'Readers can work without my API');
const values=[['Need','Only my application API','Arkiv + Graph SDK'],['Read when my API is offline','Requires another backend','Read through configured\nArkiv RPC'],['Find records and reviewers','Operator-specific discovery','Typed queries and\ncreator predicates'],['Check the selected revision','Implement a reader protocol','Verify complete signed\nmanifest locally']];
const table=s.tables.add({rows:4,columns:3,left:105,top:330,width:1700,height:360,columnWidths:[480,600,620],values});
table.borders.assign({style:'solid',fill:C.line,width:1});
for(let r=0;r<4;r++){table.rows[r].height=r===0?72:96;for(let c=0;c<3;c++){const cell=table.getCell(r,c);cell.fill=r===0?C.ink:(c===2?'#E5EBE3':C.paper);cell.text.style={typeface:'Arial',fontSize:r===0?29:30,color:r===0?C.white:C.ink,bold:r===0};}}
T(s,'Controlled fetch test',105,719,570,52,31,C.green,undefined,true);
T(s,'A clean npm consumer verified both graphs through Arkiv RPC.\nIn-process fetch blocking rejected project API requests.',710,719,1100,90,31);
T(s,'What I add to Arkiv',105,842,600,52,34,C.green,undefined,true);
T(s,'A common graph contract, conformance checks and reusable SDK, CLI and MCP readers.',710,843,1100,95,31);
T(s,'Current differentiation comes from integration quality. Independent adoption is still to earn.',105,944,1700,38,26,C.muted);

s=S('evidence','Packages / Reproducible evidence',`All counts describe project-run checks. The current full suite passes ${localTestCount} local tests. These and the 19 trust safeguards have different scopes.${security.passed===localTestCount?'':' The linked security-evaluation report records the earlier 271-test run.'} Graph 0.4.0 and AI Passport 0.6.0 were installed anonymously outside the workspace and matched reviewed release integrity. Graph 0.4.0's exact documented local example passes with 2 nodes and 1 edge with fetch disabled. The active patch versions shown here are Graph ${release.graph} and AI Passport ${release.passport}, ${release.published?'published':'pending npm publication'}. Historical clean-install evidence remains attributed to its recorded version until refreshed. Download statistics for 7-day and 30-day windows returned HTTP 404 at ${usage.fetched_at}. Unavailable does not mean zero users. The 18 historical Lighthouse 13.5 desktop-simulated mobile audits use 3 cold runs per route and phase. Before scores are 87/88/41 and after scores are 98/98/96. These scores do not grade later website changes, physical phones, field INP or this hackathon. ${site}/data/mobile-performance.json ; ${site}/data/npm-usage.json ; ${site}/data/quickstart-proof.json ; ${site}/data/security-evaluation.json.`);
H(s,'Packages and reproducible checks');
T(s,'Historical Lighthouse performance',105,339,960,60,35,C.green,undefined,true);
const chart=s.charts.add('bar',{name:'historical-mobile-lab',position:{left:90,top:424,width:940,height:425},categories:['Overview','Context','Two-client'],series:[{name:'Before',values:mobile.baseline.routes.map(r=>r.median.score),fill:'#ACB5AB'},{name:'After',values:mobile.final.routes.map(r=>r.median.score),fill:C.green}],barOptions:{direction:'column',grouping:'clustered',gapWidth:100,overlap:0},hasLegend:true,legend:{position:'bottom',textStyle:{fontSize:24,fill:C.muted}},dataLabels:{showValue:true,position:'outEnd',textStyle:{fontSize:29,fill:C.ink}},xAxis:{textStyle:{fontSize:26,fill:C.ink}},yAxis:{min:0,max:110,majorUnit:25,textStyle:{fontSize:22,fill:C.muted},majorGridlines:{fill:C.line,width:1}},chartFill:'none',chartLine:{fill:'none',width:0},plotAreaFill:'none',plotAreaLine:{fill:'none',width:0}});
applyPresentationChartFont(chart,{fontFamily:'Arial'});
T(s,'Lighthouse performance score / 100\n18 simulated audits. Median of 3 per route and phase.',105,878,960,85,29,C.muted);
T(s,`${localTestCount} local tests`,1130,350,680,68,48,C.ink,'Georgia');
T(s,'19 trust safeguard cases',1130,443,680,65,39);
L(s,1130,549,680);
T(s,release.published?'Public npm releases':'Patch releases pending publication',1130,591,680,55,33,C.green,undefined,true);
T(s,`arkiv-graph  ${release.graph}\nai-passport  ${release.passport}`,1130,674,680,104,35,C.ink,'Consolas');
T(s,'Download statistics unavailable\nOfficial npm API returned HTTP 404',1130,823,680,100,29,C.muted);
T(s,'No outside user count is established.',1130,936,680,39,26,C.muted);

s=S('getting-started','Developer access',`Use Node.js 24+. In a new folder run npm init -y and npm install @ajnasnb/arkiv-graph@${release.graph}. Graph ${release.graph} is ${release.published?'published':'pending npm publication'}. Copy the complete graph.mjs from ${repo}/blob/main/docs/GETTING_STARTED.md before node graph.mjs. That local example validates schema and traversal only. For online reads, independently review issuer/root/chain/profile policy before npx arkiv-graph verify reader.json or npx arkiv-graph mcp reader.json. Readers need no wallet. Publishing requires a funded dedicated Tiramisu testnet wallet and deliberate broadcast. No custom contract deployment is needed. Limits: one live RPC still supplies unseen history/completeness, clearing history loses retained observations, small separate root demo with manual authority/policy rotation, no scale or outside-adoption evidence. Friction ${repo}/blob/main/arkiv/friction.md and schema ${repo}/blob/main/arkiv/schema.md.`,true);
H(s,'Developer setup',true);
T(s,'Local graph example (Node.js 24+)',105,346,1030,60,42,C.white);
R(s,105,444,1030,204,'#0C241C');
T(s,`npm init -y\nnpm install @ajnasnb/arkiv-graph@${release.graph}`,134,472,974,144,30,C.white,'Consolas');
T(s,'Copy the guide’s complete graph.mjs, then run:',105,692,1025,60,32,'#C4D8CD');
T(s,'node graph.mjs',105,774,1030,65,40,C.white,'Consolas');
T(s,`No account, wallet or model is needed for this local example.${release.published?'':`\nGraph ${release.graph} is pending npm publication.`}`,105,853,1000,72,26,'#C4D8CD');
T(s,'arkivgraph.ajnasnb.com/?view=sdk',105,925,1030,46,30,C.white);
T(s,'What I would validate next',1235,346,580,110,41,C.white,'Georgia');
T(s,'An unaided outside integration\nA second-provider strategy\nLarger graphs and real phones',1235,503,580,195,32,'#C4D8CD');
T(s,'Current trust boundary',1235,763,580,54,30,C.white,undefined,true);
T(s,'Fresh readers still rely on RPC\nmetadata and unseen-history\ncompleteness.',1235,830,580,126,29,'#C4D8CD');

for(const [i,sl]of p.slides.items.entries()){const b=await p.export({slide:sl,format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));const l=await sl.export({format:'layout'});await fs.writeFile(path.join(build,`slide-${i+1}.layout.json`),await l.text());globalThis.gc?.();}
const candidate=path.join(build,'candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);
const finalPath=path.join(build,'final/arkiv-graph-pitch.pptx');
await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath,pythonExecutable:python,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','18288000,10287000','--validate-heading-fit','--validate-bullet-geometry','--require-native-table-slide','6'],explicitTotalSlideCount:8,requiredNativeChartOwnerSlides:[7],requiredNativeTableOwnerSlides:[6],materializeLiteralChartWorkbooks:true,fontPolicy:{basis:'design',families:['Arial','Georgia','Consolas']},verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')});
await fs.writeFile(path.join(build,'content-ledger.json'),JSON.stringify({schema:'arkiv-graph.editorial-pitch.v1',generated_at:new Date().toISOString(),slide_count:8,release,local_test_count:localTestCount,evidence_test_count:security.passed,scope:'No generated conceptual illustrations. Actual website captures, native editable text/architecture/table/chart. Project-run evidence only.',slides:ledger},null,2)+'\n');
console.log(JSON.stringify({build,finalPath,sha256:createHash('sha256').update(await fs.readFile(finalPath)).digest('hex')}));
