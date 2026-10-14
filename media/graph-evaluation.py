"""Create the current public evaluation report from measured release evidence."""
from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader
root=Path(__file__).resolve().parent.parent
data=root/'apps/web/public/data'
security=json.loads((data/'security-evaluation.json').read_text(encoding='utf-8'))
sdk=json.loads((data/'graph-infrastructure-evaluation.json').read_text(encoding='utf-8'))
browser=json.loads((data/'browser-evaluation.json').read_text(encoding='utf-8'))
if security['passed']!=security['total'] or sdk['passed']!=8 or browser['passed']!=16:raise RuntimeError('Complete release evidence is required')
output=root/'apps/web/public/downloads/arkiv-graph-evaluation.pdf'
c=canvas.Canvas(str(output),pagesize=(595,842));c.setTitle('Arkiv Graph release evaluation');c.setAuthor('Ajnas NB')
forest=HexColor('#102A24');ivory=HexColor('#F6F3EC');jade=HexColor('#99DAB0');ink=HexColor('#17372E')
style=ParagraphStyle('body',fontName='Helvetica',fontSize=10,leading=13.3,textColor=ink)
def paragraph(text,y,height=58):
 p=Paragraph(text,style);w,h=p.wrap(495,height);p.drawOn(c,50,y-h);return y-h-14
def title(text,y,size=16):c.setFillColor(ink);c.setFont('Helvetica-Bold',size);c.drawString(50,y,text);return y-26
c.setFillColor(ivory);c.rect(0,0,595,842,fill=1,stroke=0);c.setFillColor(forest);c.rect(0,635,595,207,fill=1,stroke=0)
c.setFillColor(jade);c.setFont('Helvetica',11);c.drawString(50,791,'ARKIV GRAPH / PROJECT-RUN EVALUATION')
c.setFillColor(ivory);c.setFont('Helvetica-Bold',29);c.drawString(50,742,'Connected evidence, verified.')
c.setFont('Helvetica',12);c.drawString(50,710,'Reusable graph SDK, bounded AI context, AI Passport reference app')
c.setFont('Helvetica',10);c.drawString(50,671,'Built by Ajnas NB | Evidence captured 14 October 2026')
for x,value,label in [(50,f"{security['passed']}/{security['total']}",'Local tests'),(232,'8/8','Direct SDK + MCP'),(414,'16/16','Browser flows')]:
 c.setFillColor(ink);c.setFont('Helvetica-Bold',28);c.drawString(x,589,value);c.setFont('Helvetica',10);c.drawString(x,565,label)
y=title('What was verified',530)
y=paragraph('A fresh consumer installed Arkiv Graph SDK 0.2.0 and AI Passport SDK 0.4.0 from release tarballs. It read both graph revisions directly from Tiramisu, verified two CLI profiles and ran eight real stdio MCP trace/context success and budget-rejection checks. It used no website backend, API key or signing wallet.',y)
y=paragraph('The infrastructure revision contains 7 nodes, 8 edges and 16 signed entities. The AI reference revision contains 27 nodes, 43 edges and 71 entities, including four selected actual run receipts. Both publishing roles are controlled by this project.',y)
y=paragraph('Public browser checks cover hosted coding inference and six guard cases, source-byte verification, bounded context export, local-file tampering, changed sources, withdrawn/expired reviews, provider outage recovery, graph switching, keyboard use, mobile layouts, theme persistence, migration and media downloads.',y)
y=title('Practical limits',y-14)
y=paragraph('The local inference orchestration tests use mocks; the browser coding test and recorded demo use real Cloudflare-hosted Llama 3.2. India arithmetic is deterministic integer calculation. UPI Safety Quest is an educational simulation citing NPCI guidance.',y)
y=paragraph('Graph verification establishes accepted authorship and complete membership of a pinned revision. It does not certify source truth, malware safety or the model provider\'s computation. The SDK is a client graph layer over Arkiv entities, with limits of 200 nodes, 500 edges and eight query pages. Public/synthetic context only; expiring records need renewal.',y)
c.setStrokeColor(HexColor('#C6D4C9'));c.line(50,120,545,120)
c.setFont('Helvetica-Bold',11);c.setFillColor(ink);c.drawString(50,98,'Reproduce and inspect the evidence')
for x,yy,label,url in [(50,75,'Live product','https://arkivgraph.ajnasnb.com'),(205,75,'SDK/MCP result','https://arkivgraph.ajnasnb.com/data/graph-infrastructure-evaluation.json'),(390,75,'Public source','https://github.com/AjnasNB/arkiv-graph'),(50,54,'Architecture','https://arkivgraph.ajnasnb.com/architecture.html'),(205,54,'Browser results','https://arkivgraph.ajnasnb.com/data/browser-evaluation.json')]:
 c.setFont('Helvetica',10);c.drawString(x,yy,label);c.linkURL(url,(x,yy-3,x+125,yy+13),relative=0)
c.save();assert len(PdfReader(str(output)).pages)==1
print('Created current one-page Arkiv Graph evaluation PDF')
