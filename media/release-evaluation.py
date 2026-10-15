"""Two-page release report from measured evidence, without a self-awarded score."""
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
assert security['passed']==security['total'] and sdk['passed']==8 and browser['passed']==browser['total']
assert session['status']=='completed' and len(session['transactions'])==3
assert all(p['published'] and p['reviewed_tarball_match'] for p in npm['packages'])
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
 ['A tarball alone did not prove a usable SDK.','Both public npm artifacts match the reviewed tarballs. Anonymous clean installs compile TypeScript, import seven entrypoints and exercise direct RPC, CLI and MCP.'],
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
add('<b>npm install @ajnasnb/arkiv-graph@0.3.0 @ajnasnb/ai-passport@0.5.0</b><br/>The repository provides anonymous clean-install scripts, public reader configurations and an explicit operator-only three-transaction lifecycle. Readers need no wallet. New writes need funded free-testnet wallets; no custom contract or payment is required.')
add('Practical limits','h')
add('Verification establishes accepted authorship and complete membership of a pinned revision. It does not attest source truth, hosted model computation, independent execution or RPC metadata/query completeness. Historical receipts cannot grant current admission. Withdrawal takes effect when observed on a fresh read. Expiring records need renewal.')
add('The local CPU benchmark stays within 200 nodes / 500 edges. Its smallest fixture shows essentially no traversal improvement; signature and manifest costs are measured separately. Network performance, production scale and external adoption are unverified. New npm statistics may be unavailable.')
add(link('/data/graph-benchmark.json','CPU benchmark')+' | '+link('/judges.html','Reproduction guide')+' | <link href="https://github.com/AjnasNB/arkiv-graph" color="#225B4B">Public source and baseline disclosures</link>','small')
def page(c,doc):
 c.saveState();c.setFillColor(ivory);c.rect(0,0,595,842,fill=1,stroke=0);c.setFillColor(forest);c.rect(0,807,595,35,fill=1,stroke=0)
 c.setFillColor(colors.HexColor('#99DAB0'));c.setFont('Helvetica',8);c.drawString(50,820,'ARKIV GRAPH / MEASURED PROJECT-RUN EVIDENCE')
 c.setFillColor(muted);c.drawString(50,24,'arkivgraph.ajnasnb.com');c.drawRightString(545,24,str(doc.page));c.restoreState()
doc=SimpleDocTemplate(str(output),pagesize=(595,842),leftMargin=50,rightMargin=50,topMargin=61,bottomMargin=45,title='Arkiv Graph release evidence',author='Ajnas NB')
doc.build(story,onFirstPage=page,onLaterPages=page)
assert len(PdfReader(str(output)).pages)==2,'Report must stay two readable pages'
print('Created two-page Arkiv Graph release evidence PDF')
