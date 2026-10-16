"""PDF companion made from the final PPTX's reviewed reimport renders."""
from pathlib import Path
import json
import sys
from PIL import Image
from reportlab.pdfgen import canvas
from pypdf import PdfReader

root = Path.cwd()
build = (root / (sys.argv[1] if len(sys.argv) > 1 else '.local/template-refresh/deck-r1')).resolve()
ledger = json.loads((build / 'content-ledger.json').read_text(encoding='utf-8'))
assert ledger['slide_count'] == 8
target = build / 'final' / 'arkiv-graph-pitch.pdf'
pdf = canvas.Canvas(str(target), pagesize=(1440, 810))
pdf.setTitle('Arkiv Graph: connected evidence for AI tools')
pdf.setAuthor('Ajnas NB')
pdf.setSubject('Infrastructure, working reference app, schema, defensibility, reproducible evidence and setup')
links = [
    'https://arkivgraph.ajnasnb.com/',
    'https://arkivgraph.ajnasnb.com/two-client/',
    'https://github.com/AjnasNB/arkiv-graph/blob/main/arkiv/schema.md',
    'https://arkivgraph.ajnasnb.com/?view=trust',
    'https://arkivgraph.ajnasnb.com/?view=handoff',
    'https://arkivgraph.ajnasnb.com/data/backend-independence.json',
    'https://arkivgraph.ajnasnb.com/data/npm-usage.json',
    'https://github.com/AjnasNB/arkiv-graph/blob/main/docs/GETTING_STARTED.md',
]
for n in range(1, 9):
    source = build / f'slide-{n}.png'
    with Image.open(source) as img:
        assert img.size == (1920, 1080)
        jpeg = build / f'slide-{n}.jpg'
        img.convert('RGB').save(jpeg, quality=94, subsampling=0, optimize=True)
    pdf.drawImage(str(jpeg), 0, 0, 1440, 810)
    pdf.linkURL(links[n - 1], (1012, 22, 1368, 65), relative=0)
    pdf.showPage()
pdf.save()
assert len(PdfReader(str(target)).pages) == 8
print(json.dumps({'pdf': str(target), 'pages': 8, 'bytes': target.stat().st_size}))
