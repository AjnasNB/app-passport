"""Release report from measured evidence, without a self-awarded score."""
from pathlib import Path
import json
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader
root=Path(__file__).resolve().parent.parent
data=root/'apps/web/public/data'
load=lambda n:json.loads((data/n).read_text(encoding='utf-8'))
security=load('security-evaluation.json');sdk=load('graph-infrastructure-evaluation-registry.json')
browser=load('browser-evaluation.json');session=load('two-client-session.json');npm=load('npm-release.json')
independence=load('backend-independence.json')
trust=load('trust-safeguards.json');mobile=load('mobile-performance.json');roots=load('root-update-publication.json')
assert security['passed']==security['total'] and sdk['passed']==8 and browser['passed']==browser['total']
assert session['status']=='completed' and len(session['transactions'])==3
assert all(p['published'] and p['reviewed_tarball_match'] for p in npm['packages'])
assert independence['passed']==7 and independence['network']['project_requests_succeeded']==0
output=root/'apps/web/public/downloads/arkiv-graph-evaluation.pdf'
forest=colors.HexColor('#102A24');ivory=colors.HexColor('#F6F3EC');ink=colors.HexColor('#17372E');muted=colors.HexColor('#52645A')
styles={k:ParagraphStyle(k,fontName='Helvetica-Bold' if k in ['title','h'] else 'Helvetica',fontSize=size,leading=leading,textColor=ink,spaceAfter=after) for k,size,leading,after in [('title',27,31,14),('h',15,20,9),('body',10,14,9),('cell',9,12,0),('small',8,11,8)]}
story=[]
def p(t,s='body'):return Paragraph(t,styles[s])
def add(t,s='body'):story.append(p(t,s))
def link(path,label):return f'<link href="https://arkivgraph.ajnasnb.com{path}" color="#225B4B">{label}</link>'
def table(rows,widths):
 t=Table([[p(str(v),'cell') for v in row] for row in rows],colWidths=widths,hAlign='LEFT')
 t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#CED8D0')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E1EAE2'))]));story.append(t)
add('Arkiv Graph<br/>Release evidence','title')
add('Built by Ajnas NB | 15 October 2026<br/>Reusable graph infrastructure with AI Passport as the working reference app.','small')
table([['Local tests','Browser checks','Direct SDK + MCP'],[f"{security['passed']} / {security['total']}",f"{browser['passed']} / {browser['total']}",'8 / 8']],[165,165,165]);story.append(Spacer(1,17))
add('What the product contributes','h')
add('Arkiv provides indexed public entities and finite storage. The SDK adds typed nodes and relationships, a complete signed manifest, bounded traversal, selected AI context, and SDK/CLI/MCP readers. Missing or changed members fail verification of the pinned revision.')
add('AI Passport demonstrates coding handoffs, exact India numbers and a UPI safety game with real Cloudflare-hosted Llama 3.2. The separate two-client lifecycle runs a deterministic release guard, with no model inference.')
add('Critical review findings and repairs','h')
table([
 ['Finding','Repair and measured evidence'],
 ['Short withdrawal could let approval return.','Insufficient observable withdrawal coverage fails closed. Publication covers the target signed deadline and storage expiry. Regression and live withdrawal checks pass.'],
 ['Copied records could exhaust the graph query budget.','Filter protocol creators before pagination. Retain local signature, index, manifest and root checks. Outsider-flood tests pass.'],
 ['Graph declarations could drift from inference.','Bind required model/runtime edges to the configured model identity and exact source bytes. Check the admission deadline immediately before inference.'],
 ['Positive observations could become stale.','Refresh on focus/network/events, expose signed deadlines, read again for each new client task, and remove positive output on provider failure.'],
 ['A tarball alone did not prove a usable SDK.','Both public npm artifacts match the reviewed tarballs. Anonymous clean installs compile TypeScript, import eight entrypoints and exercise direct RPC, CLI and MCP.'],
 ],[145,350]);story.append(Spacer(1,12))
add(link('/data/security-evaluation.json','Local tests')+' | '+link('/data/browser-evaluation.json','Browser checks')+' | '+link('/data/npm-release.json','Registry byte integrity'),'small')
story.append(PageBreak())
add('One withdrawal.<br/>Two fresh refusals.','title')
add('Tiramisu testnet | Session '+session['session_id'],'small')
rows=[['Observed event','Actual read-back / result']]
for tx in session['transactions']:rows.append([tx['kind'].capitalize(),f"Block {tx['created_at_block']} | "+link('/two-client/','Entity and transaction links')])
for r in session['observations']:rows.append([f"Client {r['consumer']} request {r['request_no']}",f"Block {r['read']['block']} | {r['admission']['status']}<br/>"+('Six guard cases passed' if r['task_executed'] else 'Task did not run')])
table(rows,[185,310]);story.append(Spacer(1,12))
add('Each client verifies the complete graph, Qarinah packet and exact source bytes, then checks the current session review. Actual website capture also shows both admitted, B refusing its next request, then A refusing. Both clients and signing wallets are project-controlled.')
add(link('/two-client/','Live demo')+' | '+link('/data/two-client-session.json','Signed snapshots and observations')+' | '+link('/data/two-client-browser-evaluation.json','Actual browser requests'),'small')
add('Reproduce with public packages','h')
add('<b>npm install @ajnasnb/arkiv-graph@0.4.0 @ajnasnb/ai-passport@0.6.0</b><br/>The repository provides anonymous clean-install scripts, public reader configurations and an explicit operator-only three-transaction lifecycle. Readers need no wallet. New writes need funded free-testnet wallets; no custom contract or payment is required.')
add('Practical limits','h')
add('Verification establishes accepted authorship and complete membership of a pinned revision. It does not attest source truth, hosted model computation, independent execution or RPC metadata/query completeness. Historical receipts cannot grant current admission. Withdrawal takes effect when observed on a fresh read. Expiring records need renewal.')
add('The local CPU benchmark stays within 200 nodes / 500 edges. Its smallest fixture shows essentially no traversal improvement; signature and manifest costs are measured separately. Network performance, production scale and external adoption are unverified. New npm statistics may be unavailable.')
add(link('/data/graph-benchmark.json','CPU benchmark')+' | '+link('/judges.html','Reproduction guide')+' | <link href="https://github.com/AjnasNB/arkiv-graph" color="#225B4B">Public source and baseline disclosures</link>','small')
story.append(PageBreak())
add('Read without<br/>this app’s API.','title')
add('Fresh anonymous npm consumer | '+independence['evaluated_at'],'small')
add('A developer receiving reviewed AI context needs a current decision even when this app is unavailable. A packet hash alone cannot discover another publisher’s review or withdrawal. Arkiv supplies indexed public records; the SDK verifies their signed relationships.')
table([['Check','Actual result'],
 ['Project API outage control','Fetch deliberately rejected'],
 ['Generic graph / complete manifest','7 nodes / 8 edges / 16 entities'],
 ['AI reference graph','27 nodes / 43 edges / 71 entities'],
 ['Original source and context identity','Exact public bytes verified'],
 ['Current withdrawn review','Fresh task refused'],
 ['Missing graph member','Incomplete revision rejected'],
 ['RPC outage control','Read failed closed'],
 ],[290,205]);story.append(Spacer(1,12))
add('<b>node scripts/verify-backend-independence.mjs</b><br/>A fresh anonymous npm install checks TypeScript and eight runtime entrypoints. Before SDK imports, a Node fetch interceptor rejects project destinations. Only the credential-free RPC and two read methods are allowed.')
network=independence['network']
add(f"Actual trace: {network['rpc_requests']} successful RPC requests, three timing reads and three indexed queries; zero successful project API requests. Reference graph block: {independence['checks'][2]['read_block']}. Current withdrawal read block: {independence['checks'][4]['read_block']}.")
add('What this establishes','h')
add('A compatible reader can query without our relay. Policy, packet and original source bytes come from the public checkout. RPC completeness and metadata remain trusted. This is an in-process fault simulation, not an OS firewall, actual outage, customer integration or global censorship-resistance proof.')
add('Postgres can serve one operator. Replacing Arkiv requires another shared publication/discovery layer for attributable records and current reviews; another public protocol could supply it. Private memory, secrets, full source bodies and inference stay off Arkiv.')
add('Immutable graph signatures cover historical source snapshots. Current npm tarballs have separate registry integrity evidence.','small')
add(link('/data/backend-independence.json','Exact queries, blocks and network trace')+' | '+link('/data/npm-release.json','Current registry byte integrity'),'small')
story.append(PageBreak())
add('Authenticated updates.<br/>Measured mobile repairs.','title')
add('Two real root revisions | 15 October 2026','small')
add('The separate root-update demonstration publishes two tiny synthetic graphs and two authority-signed revision records: eight actual entities in one Tiramisu transaction. A root revision binds the chain, registry, profile, policy and previous signed revision. The original AI reference graph remains pinned; this demonstration does not silently replace its evidence.')
add('<b>Transaction:</b> '+roots['tx_hash'],'small')
table([['Control','Verified behavior'],['Current root and graph','Both revised graphs reconstruct at the registry snapshot. Every manifest member is checked.'],['Returning-client rollback','Retained revision and block checkpoints reject older or conflicting observations.'],['Withdrawal retention','Authenticated withdrawals survive later omission, including a target first missing from the response.'],['Cross-tab concurrency','Exclusive Web Locks cover load, remote read, verification, persistence and task; storage or lock failure refuses.'],['Adversarial reproduction',f"{trust['passed']} / {trust['total']} checks. Live RPC reads are labeled separately from signed replay and synthetic failure injection."]],[145,350]);story.append(Spacer(1,12))
add('Mobile navigation lab: median of three cold runs','h')
rows=[['Hosted route','Before score','After score','After LCP / TBT / CLS']]
for before,after in zip(mobile['baseline']['routes'],mobile['final']['routes']):
 m=after['median'];rows.append([after['route'],before['median']['score'],m['score'],f"{m['largest-contentful-paint']/1000:.2f}s / {m['total-blocking-time']:.0f}ms / {m['cumulative-layout-shift']:.3f}"])
table(rows,[115,85,85,210]);story.append(Spacer(1,10))
add('Lighthouse 13.5.0, simulated mobile, 4x CPU slowdown, 150ms RTT, 1,638.4kbps; fresh Chrome profile per run. Eighteen baseline and final runs total. Production React, lazy workspaces, worker-based historical verification and stable mobile layout address measured costs. Lab scores are not design or hackathon scores, physical-device tests or field INP.')
add('One configured RPC operator remains trusted for metadata and unseen history completeness. No state-proof verifier or independent live quorum is claimed. Clearing local data loses observed history. Authority/policy changes still require an explicit consumer bootstrap; history is bounded to 64 retained root revisions.','small')
add(link('/?view=trust','Try live root verification')+' | '+link('/data/trust-safeguards.json','Trust checks')+' | '+link('/data/mobile-performance.json','All mobile samples'),'small')
def page(c,doc):
 c.saveState();c.setFillColor(ivory);c.rect(0,0,595,842,fill=1,stroke=0);c.setFillColor(forest);c.rect(0,807,595,35,fill=1,stroke=0)
 c.setFillColor(colors.HexColor('#99DAB0'));c.setFont('Helvetica',8);c.drawString(50,820,'ARKIV GRAPH / MEASURED PROJECT-RUN EVIDENCE')
 c.setFillColor(muted);c.drawString(50,24,'arkivgraph.ajnasnb.com');c.drawRightString(545,24,str(doc.page));c.restoreState()
doc=SimpleDocTemplate(str(output),pagesize=(595,842),leftMargin=50,rightMargin=50,topMargin=61,bottomMargin=45,title='Arkiv Graph release evidence',author='Ajnas NB')
doc.build(story,onFirstPage=page,onLaterPages=page)
assert len(PdfReader(str(output)).pages)==4,'Report must stay four readable pages'
print('Created four-page Arkiv Graph release evidence PDF')
