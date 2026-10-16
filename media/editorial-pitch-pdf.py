"""Package the final PPTX reimport renders as an eight-page PDF companion."""
from pathlib import Path
import json
import sys
from PIL import Image
from reportlab.pdfgen import canvas
from pypdf import PdfReader
build = (Path.cwd() / (sys.argv[1] if len(sys.argv) > 1 else '.local/editorial-pitch/r2')).resolve()
assert json.loads((build / 'content-ledger.json').read_text(encoding='utf-8'))['slide_count'] == 8
target = build / 'final' / 'arkiv-graph-pitch.pdf'
pdf = canvas.Canvas(str(target), pagesize=(1440, 810))
pdf.setTitle('Arkiv Graph: evidence graphs for AI tools')
pdf.setAuthor('Ajnas NB')
pdf.setSubject('Product, current review withdrawal, architecture, working reference app and developer access')
for n in range(1, 9):
    with Image.open(build / f'slide-{n}.png') as image:
        assert image.size == (1920, 1080)
        jpeg = build / f'slide-{n}.jpg'
        image.convert('RGB').save(jpeg, quality=94, subsampling=0, optimize=True)
    pdf.drawImage(str(jpeg), 0, 0, 1440, 810)
    pdf.linkURL('https://arkivgraph.ajnasnb.com/', (70, 18, 290, 59), relative=0)
    if n == 1:
        pdf.linkURL('https://arkivgraph.ajnasnb.com/', (590, 87, 1365, 130), relative=0)
    if n == 8:
        pdf.linkURL('https://arkivgraph.ajnasnb.com/?view=sdk', (75, 80, 850, 120), relative=0)
    pdf.showPage()
pdf.save()
assert len(PdfReader(str(target)).pages) == 8
print(json.dumps({'pdf': str(target), 'pages': 8, 'bytes': target.stat().st_size}))
