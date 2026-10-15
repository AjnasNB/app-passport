"""Package the reviewed slide renders as a compact seven-page pitch PDF.

The PPTX retains editable labels and the native measurement chart. This companion
PDF intentionally uses the exact inspected slide images and clickable evidence
links, with generated artwork identified in PPTX speaker notes/content ledger.
"""
from pathlib import Path
import json
import sys
from PIL import Image
from reportlab.pdfgen import canvas
from pypdf import PdfReader

root = Path.cwd()
build = (root / (sys.argv[1] if len(sys.argv) > 1 else '.local/media-trust-refresh/deck-r1')).resolve()
ledger = json.loads((build / 'content-ledger.json').read_text(encoding='utf-8'))
if ledger['slide_count'] != 7:
    raise RuntimeError('The source deck must contain seven reviewed pages')
output = build / 'final' / 'arkiv-graph-trust-pitch.pdf'
output.parent.mkdir(parents=True, exist_ok=True)
canvas_pdf = canvas.Canvas(str(output), pagesize=(1440, 810))
canvas_pdf.setTitle('Arkiv Graph: roots, withdrawals and reproducible evidence')
canvas_pdf.setAuthor('Ajnas NB')
canvas_pdf.setSubject('Seven-page hackathon deck. Project-run evidence. Explicit RPC trust limits.')
links = {
    1: 'https://github.com/AjnasNB/arkiv-graph',
    2: 'https://arkivgraph.ajnasnb.com/data/backend-independence.json',
    3: 'https://arkivgraph.ajnasnb.com/data/root-update-publication.json',
    4: 'https://arkivgraph.ajnasnb.com/data/trust-safeguards.json',
    5: 'https://arkivgraph.ajnasnb.com/?view=handoff',
    6: 'https://arkivgraph.ajnasnb.com/data/mobile-performance.json',
    7: 'https://arkivgraph.ajnasnb.com/judges.html',
}
for number in range(1, 8):
    source = build / f'slide-{number}.png'
    with Image.open(source) as image:
        if image.size != (1920, 1080):
            raise RuntimeError('Unexpected slide image dimensions')
        # Format conversion only. All composition and editable content come from
        # the artifact-tool presentation render, not a Python drawing routine.
        jpeg = build / f'slide-{number}.jpg'
        image.convert('RGB').save(jpeg, quality=94, subsampling=0, optimize=True)
    canvas_pdf.drawImage(str(jpeg), 0, 0, 1440, 810)
    canvas_pdf.linkURL(links[number], (0, 0, 1440, 810), relative=0)
    canvas_pdf.showPage()
canvas_pdf.save()
reader = PdfReader(str(output))
assert len(reader.pages) == 7
assert output.stat().st_size < 25 * 1024 * 1024
print(json.dumps({'pdf': str(output), 'pages': len(reader.pages), 'bytes': output.stat().st_size}))
