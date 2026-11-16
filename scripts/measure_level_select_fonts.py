"""Measure the supplied title font; no synthetic replacement for native glyphs."""
import json
from pathlib import Path
from PIL import ImageFont
font=ImageFont.truetype('reference/apk/assets/kr6-phone/fonts/NotoSansCJKsc-Bold.otf',36)
titles=json.loads(Path('analysis/level-select-font-input.json').read_text())
Path('analysis/level-select-font-widths.json').write_text(json.dumps({title.upper():font.getlength(title.upper()) for title in titles},ensure_ascii=False))
