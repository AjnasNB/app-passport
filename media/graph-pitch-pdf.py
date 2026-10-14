from pathlib import Path
from reportlab.pdfgen import canvas
from pypdf import PdfReader

root = Path.cwd()
output = root / 'apps/web/public/downloads/arkiv-graph-pitch.pdf'
c = canvas.Canvas(str(output), pagesize=(1440, 810))
c.setTitle('Arkiv Graph and AI Passport')
c.setAuthor('Ajnas NB')
for i in range(1, 8):
    image = root / f'apps/web/public/downloads/arkiv-graph-pitch-pages/slide-{i}.png'
    if not image.exists():
        raise RuntimeError('Final PPT slide image missing')
    c.drawImage(str(image), 0, 0, 1440, 810)
    if i == 7:
        c.linkURL('https://passport.ajnasnb.com/', (70, 145, 620, 215), relative=0)
    c.showPage()
c.save()
assert len(PdfReader(str(output)).pages) == 7
print('Created seven-page graphical pitch PDF')
