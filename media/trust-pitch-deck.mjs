import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

// Image-led, seven-page judging deck. The manifest is deliberately mandatory:
// conceptual artwork can never silently replace an actual product capture.
const root = process.cwd();
const runtime = process.env.ARTIFACT_NODE_MODULES;
const runtimePython = process.env.ARTIFACT_PYTHON;
const skill = process.env.ARTIFACT_PRESENTATIONS_SKILL;
if (!runtime || !runtimePython || !skill) throw new Error('Use the bundled presentation runtime and skill paths.');
// The first-party import validator runs in a child process and reads the
// runtime's standard discovery variable rather than this builder's shorthand.
process.env.RUNTIME_NODE_MODULES = runtime;
const manifestPath = path.resolve(root, process.argv[2] || '.local/media-trust-refresh/assets.json');
const build = path.resolve(root, process.argv[3] || '.local/media-trust-refresh/deck-r1');
const output = path.join(build, 'final');
await fs.mkdir(output, {recursive: true});
const assets = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const expectedKeys = ['cover', 'why-arkiv', 'root-update', 'withdrawal', 'ai-india', 'evidence', 'toolkit'];
if (!Array.isArray(assets.slides) || expectedKeys.some(key => !assets.slides.some(s => s.key === key && s.path))) {
  throw new Error('Seven explicitly approved generated slide artworks are required.');
}
for (const image of assets.slides) await fs.access(image.path);
if (!assets.screenshots?.ai || !assets.screenshots?.trust) throw new Error('Actual hosted AI and trust captures are required.');
await Promise.all(['ai', 'trust'].map(key => fs.access(assets.screenshots[key])));

const req = createRequire(path.join(runtime, 'presentation-font.cjs'));
const {GlobalFonts} = req('@napi-rs/canvas');
GlobalFonts.registerFromPath(path.join(root, 'apps/web/public/fonts/dm-sans-latin.woff2'), 'DM Sans');
if (!GlobalFonts.families.some(f => f.family === 'DM Sans')) throw new Error('DM Sans font registration failed.');
const {Presentation, PresentationFile} = await import(pathToFileURL(path.join(runtime, '@oai/artifact-tool/dist/artifact_tool.mjs')));
const {finalizePresentation, applyPresentationChartFont} = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')));
const p = Presentation.create({slideSize: {width: 1920, height: 1080}});
const C = {forest: '#102A24', ivory: '#F6F3EC', jade: '#99DAB0', amber: '#D9AF5E', ink: '#17372E', muted: '#52645A', light: '#DCEADD', green: '#225B4B'};
const dataDir = path.join(root, 'apps/web/public/data');
const read = async file => JSON.parse(await fs.readFile(path.join(dataDir, file + '.json'), 'utf8'));
const [security, browser, safeguards, npmTrust, npmMcp, mobile, publication, npm] = await Promise.all([
  read('security-evaluation'), read('browser-evaluation'), read('trust-safeguards'), read('npm-trust-consumer'),
  read('graph-infrastructure-evaluation'), read('mobile-performance'), read('root-update-publication'), read('npm-release'),
]);
for (const r of [security, browser, safeguards, npmTrust, npmMcp]) {
  if (!Number.isSafeInteger(r.total) || r.passed !== r.total) throw new Error('Deck requires complete passing evidence snapshots.');
}
if (!mobile.final.complete || mobile.sample_count !== 18 || publication.transactions !== 1 || publication.entities !== 8) {
  throw new Error('Unexpected mobile or root-publication evidence.');
}
if (!npm.packages?.some(pkg => pkg.name === '@ajnasnb/arkiv-graph' && pkg.version === '0.4.0' && pkg.published && pkg.reviewed_tarball_match)
  || !npm.packages?.some(pkg => pkg.name === '@ajnasnb/ai-passport' && pkg.version === '0.6.0' && pkg.published && pkg.reviewed_tarball_match)) {
  throw new Error('The displayed npm releases must match verified published package bytes.');
}
const mainRepo = 'https://github.com/AjnasNB/arkiv-graph';
const site = 'https://arkivgraph.ajnasnb.com';
const ledger = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function text(s, value, x, y, w, h, size = 40, color = C.ink, bold = false, name = '') {
  const shape = s.shapes.add({name, geometry: 'textbox', position: {left: x, top: y, width: w, height: h}, fill: 'none', line: {fill: 'none', width: 0}});
  shape.text = value;
  shape.text.style = {typeface: 'DM Sans', fontSize: size, color, bold};
  return shape;
}
async function image(s, file, x, y, w, h, alt, fit = 'contain') {
  const b = await fs.readFile(file);
  s.images.add({blob: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), contentType: path.extname(file).toLowerCase() === '.jpg' ? 'image/jpeg' : 'image/png', alt, fit, position: {left: x, top: y, width: w, height: h}});
}
async function slide(key, notes, dark = false) {
  const s = p.slides.add();
  s.background.fill = dark ? C.forest : C.ivory;
  const asset = assets.slides.find(a => a.key === key);
  await image(s, asset.path, 0, 0, 1920, 1080, 'Original generated conceptual artwork, not a product screenshot or customer deployment', 'cover');
  s.speakerNotes.text = notes;
  ledger.push({slide: p.slides.items.length, key, generated_art: {path: path.relative(root, asset.path).replaceAll('\\', '/'), sha256: hash(await fs.readFile(asset.path)), role: 'Conceptual illustration only'}, notes});
  return s;
}
function foot(s, number, dark = false) {
  const color = dark ? C.light : C.muted;
  text(s, 'I built this: Ajnas NB', 90, 1007, 650, 38, 24, color);
  text(s, `${number} / 7`, 1750, 1007, 100, 38, 24, color);
}
function heading(s, value, dark = false, width = 1730) {
  text(s, value, 90, 70, width, 140, 78, dark ? C.ivory : C.ink, true);
}

let s = await slide('cover',
  `Problem and users: copied AI-tool context can remain in circulation after its review is withdrawn. A content hash identifies bytes but does not discover connected sources, accepted authors or current withdrawal records. Arkiv Graph is a reusable MIT TypeScript SDK with CLI and stdio MCP; AI Passport is the working reference app. Target users are AI-tool developers and security reviewers. Open Source and Security are the proposed hackathon tracks. All wallets and demo consumers are project-controlled. There is no outside-adoption claim. Builder: Ajnas NB. Product source: ${mainRepo}/blob/main/ARKIV_GRAPH.md . Official judging rubric: https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/docs/scoring-rubric.md . Artwork is generated conceptual imagery.`, true);
text(s, 'Arkiv Graph', 90, 126, 1000, 145, 110, C.ivory, true);
text(s, 'Shared graph evidence\nfor AI tools', 95, 300, 900, 180, 62, C.ivory, true);
text(s, 'A copied approval can\noutlive its review', 95, 582, 770, 130, 43, C.light);
text(s, 'AI-tool developers', 95, 815, 750, 55, 33, C.jade, true);
text(s, 'Security reviewers', 95, 874, 750, 55, 33, C.jade, true);
foot(s, 1, true);

s = await slide('why-arkiv',
  `Why Arkiv: it supplies a shared public indexed entity/query layer with protocol creator metadata, time-limited storage and transactions. A separately installed reader can query those records without this project's website API and choose its accepted authors and root policy. The SDK verifies signed graph membership and performs traversal; Arkiv is not represented as a native graph database or Cypher engine. A private conventional database can support a single operator's app. Another public protocol could implement a similar model; Arkiv's indexed public entity model is the concrete fit used here. Private Qarinah memory, original full source, inference and secrets stay off chain. Evidence: ${site}/data/backend-independence.json . Current package reuse: ${site}/data/npm-trust-consumer.json . Architecture: ${mainRepo}/blob/main/ARCHITECTURE.md . Arkiv query docs: https://docs.arkiv.network/json-rpc/querying-data/ . RPC metadata, current history and query completeness remain provider assumptions.`);
heading(s, 'Why Arkiv');
text(s, 'Readers query shared records\nwithout my application API', 95, 238, 1050, 145, 53, C.green, true);
text(s, 'Arkiv', 95, 470, 650, 62, 44, C.ink, true);
text(s, 'Indexed entities, creator metadata, expiry', 95, 543, 1050, 70, 34, C.muted);
text(s, 'Arkiv Graph', 95, 680, 700, 62, 44, C.ink, true);
text(s, 'Signed membership and graph traversal', 95, 752, 1050, 70, 34, C.muted);
text(s, 'Private memory and inference stay off chain', 95, 906, 1500, 55, 32, C.green, true);
foot(s, 2);

s = await slide('root-update',
  `Actual root update: ${publication.revisions.length} signed root-revision envelopes plus complete tiny graphs, ${publication.entities} readonly entities in ${publication.transactions} batch transaction. Transaction ${publication.tx_url} confirmed at block ${publication.confirmed_block}. The root-update demonstration is a separate public synthetic tiny graph, not a migration of the larger signed AI reference graph. Revision one has 1 node, 0 edges and 2 graph entities. Revision two has 2 nodes, 1 edge and 4 graph entities. The remaining 2 entities are the signed revision envelopes. Reader policy pins authority, chain, registry, graph profile, policy digest and genesis root. Each revision binds sequence, previous root, previous revision digest, issue time and deadline. Verification rejects tampering, expired heads and rollback/forks relative to a retained checkpoint. Source: ${mainRepo}/blob/main/packages/arkiv-graph/src/root-registry.ts . Public proof: ${site}/data/root-update-publication.json and ${site}/data/trust-safeguards.json . An authority-signed root is authorization, not proof of source truth. A fresh reader cannot discover a newer head omitted by all sources. Product capture is the actual hosted trust view, not generated UI.`, true);
heading(s, 'Authenticated root updates', true);
text(s, 'Pinned authority', 95, 253, 770, 70, 45, C.ivory, true);
text(s, 'Scope and previous digest', 95, 345, 800, 70, 39, C.light);
text(s, 'Deadline and retained checkpoint', 95, 432, 880, 75, 37, C.light);
text(s, '2 revisions', 95, 604, 790, 92, 64, C.jade, true);
text(s, '8 entities in 1 transaction', 95, 705, 890, 70, 41, C.ivory, true);
text(s, 'Separate tiny graph. Actual Tiramisu publication.', 95, 875, 1660, 60, 30, C.light);
await image(s, assets.screenshots.trust, 1010, 253, 820, 563, 'Actual hosted Arkiv Graph trust workspace showing the root registry and safeguards');
foot(s, 3, true);

s = await slide('withdrawal',
  `Actual lifecycle: passport transaction at block603788, review at603792 and same-author withdrawal at603917. Consumers A and B admitted at603794 and603795. B's next request refused at603919 and A's next request refused at603920. Both consumers and publisher/reviewer wallets are project-controlled. Recorded session: ${site}/data/two-client-session.json . Withdrawal tx: https://tiramisu.explorer.arkiv.network/tx/0xfc8d4ae3df1948b1497e2b090476a2954f43f997bc122e923c155768fed6bc62 . New safeguards retain an authentic withdrawal even when its target is temporarily absent, persist the journal before admitting a task, and serialize same-origin browser access through Web Locks. Storage/lock failures refuse admission. Browser tests cover reload and separate same-origin tabs. Replay evidence and synthetic omissions are distinct from live RPC reads: ${site}/data/trust-safeguards.json and ${site}/data/browser-evaluation.json . Storage lifetime must cover the target and signed deadlines. This is next-request enforcement, not instantaneous revocation of an already-running task. Deleting local storage loses observed history. A single provider can hide an unseen withdrawal from a fresh reader.`);
heading(s, 'Withdrawal blocks the next task');
text(s, '3 real transactions', 95, 248, 1060, 86, 58, C.green, true);
text(s, '2 project-run clients both refused', 95, 345, 1130, 80, 43, C.ink, true);
text(s, 'Withdrawal retained while target is absent', 95, 515, 1090, 65, 35, C.ink, true);
text(s, 'Storage failure refuses admission', 95, 605, 1090, 65, 39, C.ink, true);
text(s, 'Cross-tab lock guards the journal', 95, 695, 1090, 65, 39, C.ink, true);
text(s, 'Retained history survives reload', 95, 863, 1150, 60, 33, C.green, true);
text(s, 'Resetting local storage loses that history', 95, 929, 1300, 45, 28, C.muted);
foot(s, 4);

s = await slide('ai-india',
  `Working reference application: AI Passport verifies connected source evidence, context packet, runtime declaration and current review before hosted inference. The real product model is Cloudflare Workers AI @cf/meta/llama-3.2-3b-instruct. Six deterministic coding guard cases and hosted inference are separate evidence. Actual tasks include a source-driven coding handoff, exact integer-paise and lakh/crore number tools in English/Hindi, and a UPI safety learning quest with optional AI coach. India relevance is the bilingual tools and safety learning demonstration; no Indian deployment partners, measured social outcomes or external users are claimed. Qarinah private project memory stays local; public demo packets are synthetic. The original Qarinah folders remain unchanged. Runtime input receipt: ${site}/data/ai-journey-run.json . Real use/guard evidence: ${site}/data/ai-evaluation.json . Public app: ${site}/?view=handoff and ${site}/?view=tools . Qarinah reuse baseline and licenses: ${mainRepo}/blob/main/README.md . The screenshot is an actual hosted workspace. Artwork is conceptual, not a photo of users.`, true);
heading(s, 'AI Passport in use', true);
text(s, 'Source-bound coding handoff', 95, 246, 1240, 70, 43, C.ivory, true);
text(s, 'English and Hindi number tools', 95, 340, 1250, 70, 40, C.light);
text(s, 'UPI safety learning', 95, 432, 900, 65, 40, C.light);
text(s, 'Private Qarinah\nmemory stays local', 95, 676, 650, 125, 42, C.jade, true);
text(s, 'Public and synthetic evidence only', 95, 900, 1600, 60, 31, C.light);
await image(s, assets.screenshots.ai, 775, 540, 1050, 345, 'Actual hosted AI Passport coding handoff with context evidence and runtime receipt');
foot(s, 5, true);

s = await slide('evidence',
  `Actual project-run results, not an independent security audit or outside adoption: ${security.passed}/${security.total} local unit/API/security tests; ${browser.passed}/${browser.total} hosted browser checks; ${safeguards.passed}/${safeguards.total} trust checks; ${npmTrust.passed}/${npmTrust.total} isolated installed public npm trust checks; ${npmMcp.passed}/${npmMcp.total} actual MCP checks. Test sets overlap in feature coverage and are not added into one denominator. Sources: ${site}/data/security-evaluation.json , ${site}/data/browser-evaluation.json , ${site}/data/trust-safeguards.json , ${site}/data/npm-trust-consumer.json , ${site}/data/graph-infrastructure-evaluation.json . Native chart uses actual baseline and final medians, not illustrative data. Mobile method: Lighthouse${mobile.configuration.tool.replace('Lighthouse ', '')}, three fresh Chrome profiles for each route in each release, 18 samples total. Viewport412x823, 4x simulated CPU slowdown,150msRTT,1638.4kbps. Overview87 to98, Context88 to98, Two-client41 to96. Final median LCP:1.996s,2.067s,2.414s. Final median TBT:4.5ms,0ms,0ms. Final median CLS:0,0,0.01085. Lab results on a Windows desktop, not a physical phone or field Core Web Vitals. No INP or production scale claim. Background historical signature verification can continue after first paint. Measurement: ${site}/data/mobile-performance.json . Reproduce: npm exec --yes --package lighthouse@13.5.0 -- node scripts/mobile-performance.mjs baseline; deploy candidate; repeat with final.`, false);
heading(s, 'Measured evidence');
text(s, `${security.passed}`, 95, 250, 380, 105, 76, C.green, true);
text(s, 'Local tests', 100, 355, 400, 54, 31, C.muted);
text(s, `${browser.passed}`, 420, 250, 300, 105, 76, C.green, true);
text(s, 'Browser checks', 425, 355, 330, 54, 29, C.muted);
text(s, `${safeguards.passed}`, 745, 250, 300, 105, 76, C.green, true);
text(s, 'Trust checks', 750, 355, 300, 54, 29, C.muted);
text(s, `${npmTrust.passed}`, 1070, 250, 280, 105, 76, C.green, true);
text(s, 'Installed SDK checks', 1075, 355, 340, 54, 27, C.muted);
const routeNames = ['Overview', 'Context', 'Two-client'];
const chart = s.charts.add('bar', {
  name: 'mobile-performance', position: {left: 85, top: 454, width: 1210, height: 404},
  categories: routeNames,
  series: [
    {name: 'Before', values: mobile.baseline.routes.map(r => r.median.score), fill: C.amber},
    {name: 'After', values: mobile.final.routes.map(r => r.median.score), fill: C.green},
  ],
  barOptions: {direction: 'column', grouping: 'clustered', gapWidth: 90, overlap: 0},
  hasLegend: true, legend: {position: 'bottom', textStyle: {fontSize: 24, fill: C.muted}},
  dataLabels: {showValue: true, position: 'outEnd', textStyle: {fontSize: 28, fill: C.ink}},
  xAxis: {textStyle: {fontSize: 27, fill: C.ink}},
  yAxis: {min: 0, max: 100, majorUnit: 25, numberFormatCode: '0', textStyle: {fontSize: 22, fill: C.muted}, majorGridlines: {fill: '#C6CEC5', width: 1}},
  chartFill: 'none', chartLine: {fill: 'none', width: 0}, plotAreaFill: 'none', plotAreaLine: {fill: 'none', width: 0},
});
applyPresentationChartFont(chart, {fontFamily: 'DM Sans'});
text(s, 'Mobile Lighthouse. Median of 3 per route and phase.', 95, 888, 1750, 53, 31, C.green, true);
text(s, '18 cold-load lab runs. Simulated desktop, no physical-phone or field claim.', 95, 946, 1780, 44, 26, C.muted);
foot(s, 6);

s = await slide('toolkit',
  `Setup: npm install @ajnasnb/arkiv-graph@0.4.0 . AI Passport adapter: @ajnasnb/ai-passport@0.6.0 . Both public registry packages and anonymous byte integrity are documented at ${site}/data/npm-release.json . Download the public reader configuration at ${site}/data/arkiv-graph-reader.json and independently inspect accepted authority/root policy; npm package installation does not establish trust. Run npx arkiv-graph verify reader.json or npx arkiv-graph mcp reader.json . Root-trust configuration: ${site}/data/root-trust-config.json . Repro commands and exact query fields: ${mainRepo}/blob/main/ARKIV_GRAPH.md , ${mainRepo}/blob/main/arkiv/schema.md . Friction with exact observations and fixes: ${mainRepo}/blob/main/arkiv/friction.md . Actual SDK0.8.1 transport timing is epoch seconds, converted to milliseconds. The official hosted RPC returned -32601 for eth_getProof; no state-proof verifier is implemented. Withdrawal storage must cover target storage and signed validity. Root bootstrap is pinned; authenticated revisions and local checkpoints do not prove fresh-client non-omission. Only one live provider, finite200node/500edge/8page/depth8bounds, no native Cypher or production scale claim. Original full source/private memory/model inference remain off chain. Public source is MIT with disclosed Apache-2.0 Qarinah reuse. Both publishers/consumers project-operated. This deck answers the four equal25point areas: problem/pillar/India, WhyArkiv, actualfeatureuse, reproduciblefriction.`, true);
heading(s, 'Open toolkit. Explicit trust.', true);
text(s, 'npm install @ajnasnb/arkiv-graph@0.4.0', 95, 236, 1300, 75, 35, C.ivory, true);
text(s, '@ajnasnb/ai-passport 0.6.0', 95, 318, 1260, 65, 35, C.light);
text(s, 'npx arkiv-graph verify apps/web/public/data/arkiv-graph-reader.json\nnpx arkiv-graph mcp apps/web/public/data/arkiv-graph-reader.json', 95, 440, 1500, 140, 29, C.ivory);
text(s, 'Friction documented', 95, 647, 1200, 65, 39, C.jade, true);
text(s, 'Wire time uses seconds. eth_getProof is unavailable.\nWithdrawal lifetime must cover its target.', 95, 720, 1550, 92, 29, C.light);
text(s, 'Fresh readers still trust RPC completeness', 95, 820, 1740, 65, 37, C.amber, true);
text(s, 'arkivgraph.ajnasnb.com/judges.html', 95, 925, 1640, 60, 34, C.ivory, true);
foot(s, 7, true);

for (const [i, slide] of p.slides.items.entries()) {
  const b = await p.export({slide, format: 'png', scale: 1});
  await fs.writeFile(path.join(build, `slide-${i + 1}.png`), new Uint8Array(await b.arrayBuffer()));
  const layout = await slide.export({format: 'layout'});
  await fs.writeFile(path.join(build, `slide-${i + 1}.layout.json`), await layout.text());
  globalThis.gc?.();
}
globalThis.gc?.();
const candidate = path.join(build, 'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
const finalPptx = path.join(output, 'arkiv-graph-trust-pitch.pptx');
const finalized = await finalizePresentation({
  workspaceDir: root, candidatePath: candidate, finalPath: finalPptx,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skill, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '18288000,10287000', '--validate-heading-fit', '--validate-bullet-geometry'],
  explicitTotalSlideCount: 7,
  requiredNativeChartOwnerSlides: [6], requiredNativeTableOwnerSlides: [],
  materializeLiteralChartWorkbooks: true,
  fontPolicy: {basis: 'design', families: ['DM Sans']},
  verifyArtifactToolImport: true,
  receiptPath: path.join(build, 'validation.json'),
});
await fs.writeFile(path.join(build, 'content-ledger.json'), JSON.stringify({
  schema: 'arkiv-graph.pitch-content.v1', generated_at: new Date().toISOString(), slide_count: 7,
  scope: 'Original generated conceptual artworks, editable native text/chart, and actual hosted product captures. Project-run evidence only.',
  reports: {security: security.total, browser: browser.total, safeguards: safeguards.total, npm_trust: npmTrust.total, actual_mcp: npmMcp.total, mobile_samples: mobile.sample_count},
  publication: {transaction: publication.tx_hash, entities: publication.entities, revisions: publication.revisions.length},
  native_chart: {slide: 6, categories: routeNames, before: mobile.baseline.routes.map(r => r.median.score), after: mobile.final.routes.map(r => r.median.score)},
  slides: ledger,
}, null, 2) + '\n');
console.log(JSON.stringify({build, finalPptx, slides: p.slides.items.length, validation: path.join(build, 'validation.json'), finalization_completed: Boolean(finalized)}));
