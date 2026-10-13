import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4

root = Path(__file__).resolve().parent.parent
data = root / 'apps/web/public/data'
load = lambda name: json.loads((data / name).read_text(encoding='utf-8'))
tools, protocol, security, live, consumer = [load(n) for n in ['tools.json','protocol-evaluation.json','security-evaluation.json','live-verification.json','consumer-evaluation.json']]
out = root / 'output/pdf/app-passport-evaluation.pdf'
out.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
ink, accent, muted, line = [colors.HexColor(c) for c in ['#182825','#225b4b','#596b66','#dbe4e0']]
styles.add(ParagraphStyle(name='Hero',fontName='Helvetica-Bold',fontSize=30,leading=33,textColor=ink,spaceAfter=18))
styles.add(ParagraphStyle(name='Section',fontName='Helvetica-Bold',fontSize=16,leading=20,textColor=ink,spaceBefore=14,spaceAfter=9))
styles.add(ParagraphStyle(name='Copy',fontName='Helvetica',fontSize=10,leading=15,textColor=ink,spaceAfter=8))
styles.add(ParagraphStyle(name='SmallCopy',fontName='Helvetica',fontSize=8,leading=11,textColor=muted,spaceAfter=6))
styles.add(ParagraphStyle(name='Cell',fontName='Helvetica',fontSize=8,leading=11,textColor=ink))
story=[]
def text(s,style='Copy'): story.append(Paragraph(s,styles[style]))
def section(s): text(s,'Section')
def link(url,label): return f'<link href="{url}" color="#225b4b">{label}</link>'
text('QARINAH + ARKIV / EVALUATION', 'SmallCopy')
text('AppPassport.<br/>Know what your AI uses.', 'Hero')
text('I built AppPassport to check an exact AI tool or context packet against attributable, current review evidence. Private memory stays local. Another application can read the evidence directly from Arkiv.', 'Copy')
text(link('https://passport.ajnasnb.com','Live application')+' | '+link('https://github.com/AjnasNB/app-passport','Source and reproduction')+' | Built by Ajnas NB','SmallCopy')
metrics=Table([[f'{len(tools)} artifacts',f'{protocol["passed"]}/{protocol["total"]} protocol calls',f'{security["passed"]}/{security["total"]} tests'],[f'{live["records"]} chain records',f'{live["passed"]}/{live["total"]} chain outcomes','Clean SDK install passed']],colWidths=[165,165,165])
metrics.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#edf3ef')),('TEXTCOLOR',(0,0),(-1,-1),accent),('FONTNAME',(0,0),(-1,-1),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),11),('TOPPADDING',(0,0),(-1,-1),15),('BOTTOMPADDING',(0,0),(-1,-1),15),('LEFTPADDING',(0,0),(-1,-1),12)]))
story.extend([Spacer(1,15),metrics])
section('The public demonstration')
text('1. Open Context handoff and verify the current Qarinah release packet.<br/>2. Change its source snapshot or modify the packet: admission is denied.<br/>3. Select a withdrawn or expired review: admission is denied.<br/>4. Choose an AI tool, check its pinned artifact, then upload changed bytes.<br/>5. Download the SDK and reproduce the decision through the raw RPC.')
section('Why Arkiv is part of the design')
text('The hash identifies bytes. A separate author supplies the current review and can withdraw a particular earlier record. Arkiv provides queryable creator metadata, typed artifact indexes, readonly payloads and expiring storage. A consumer chooses accepted authors and reads their records through its own provider, without depending on the AppPassport API.')
text('A conventional database can implement the same application checks. Arkiv matters when applications share attributable review status through a common external data layer. It is not necessary for local hashing, local memory or every single-company deployment.')
section('What these results establish')
text('The compiler produced genuine Qarinah packets from a synthetic repository. Ten tools initialized, listed their MCP tools and completed one controlled call. The clean consumer installed the SDK tarball with published Qarinah 0.7.0, checked an actual source file, admitted the context and passed the independent CLI check.')
text('These are project-run checks, not an independent security audit. No malware-detection accuracy, upstream endorsement, customer adoption or second LLM inference run is claimed. Both demo wallets are project controlled. Chain metadata and query completeness rely on the RPC provider.','SmallCopy')
story.append(PageBreak())
text('PINNED ARTIFACTS / REPRODUCIBLE EVIDENCE','SmallCopy')
text('Ten real tool artifacts.', 'Hero')
rows=[[Paragraph(h,styles['Cell']) for h in ['Tool / release','MCP tools','Result','SHA-256 prefix']]]
for item in tools:
 p=next(r for r in protocol['results'] if r['id']==item['id'])
 cells=[escape(item['descriptor']['name'])+'<br/>'+escape(item['descriptor']['version']),str(p['tool_count']),'Passed' if p['passed'] else 'Failed',item['descriptor']['artifact_digest'][7:23]]
 rows.append([Paragraph(c,styles['Cell']) for c in cells])
table=Table(rows,colWidths=[215,65,55,160],repeatRows=1,hAlign='LEFT')
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#edf3ef')),('LINEBELOW',(0,0),(-1,0),1,line),('LINEBELOW',(0,1),(-1,-1),.4,line),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('VALIGN',(0,0),(-1,-1),'TOP')]))
story.append(table)
text('Nine artifacts passed registry integrity checks. Qarinah is a disclosed source snapshot from baseline commit 1aa70228299de902d92fc97214766c0aea02be9d. Full digests, source URLs and the dependency lock are in the public source and JSON reports.','SmallCopy')
section('Direct chain evidence')
text(f'Tiramisu, chain ID 7738577. Namespace: app-passport-v1.<br/>Read-back block: {live["block"]}. Evaluated at: {escape(live["verified_at"])}.<br/>Producer: 0x4FEade3FF513A7954e9f7420aaa7BDEdc0BA4BDC.<br/>Reviewer: 0xd153C0cC313884DA0065615BB411Dfb8b873fE54.','SmallCopy')
text('The 31 records include ten tool passports, three context passports, reviews and real withdrawals. Earlier failed browser-client checks are retained in the transaction journal; those negative reviews were withdrawn before fresh reviews were issued. Original Qarinah folders and commits remain unchanged.','SmallCopy')
section('Reproduce and inspect')
text('From passport-demo: npm ci --ignore-scripts; npm run build; npm test; npm run fixtures; npm run arkiv:verify; npm run handoff:consume. The independent reader needs no signing wallet. Publication uses free testnet GLM. The public application requires no wallet, payment or login.','SmallCopy')
text(link('https://passport.ajnasnb.com/data/protocol-evaluation.json','Protocol results')+' | '+link('https://passport.ajnasnb.com/data/security-evaluation.json','SDK and API tests')+' | '+link('https://passport.ajnasnb.com/data/live-verification.json','Chain read-back')+' | '+link('https://passport.ajnasnb.com/data/consumer-evaluation.json','Clean consumer')+' | '+link('https://passport.ajnasnb.com/data/chain-evidence.json','Entity and transaction journal'),'SmallCopy')
def page(canvas,doc):
 canvas.setStrokeColor(line);canvas.line(50,42,A4[0]-50,42);canvas.setFillColor(muted);canvas.setFont('Helvetica',8);canvas.drawString(50,28,'AppPassport / Built by Ajnas NB / 13 October 2026');canvas.drawRightString(A4[0]-50,28,str(doc.page))
SimpleDocTemplate(str(out),pagesize=A4,leftMargin=50,rightMargin=50,topMargin=45,bottomMargin=60,title='AppPassport evaluation',author='Ajnas NB').build(story,onFirstPage=page,onLaterPages=page)
print(json.dumps({'pdf_created':str(out.relative_to(root))}))
