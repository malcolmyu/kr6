"""Losslessly unpack selected original GUI atlas frames, restoring trim margins."""
import json
from PIL import Image
from pathlib import Path
root = Path('runtime/desktop_assets/kr6-phone/images/ipadhd')
sources = {}
for name, frame in json.load(open('analysis/power-icons.json')).items():
    x, y, w, h = frame['f_quad']
    if frame['a_name'] not in sources:
        sources[frame['a_name']] = Image.open(root / frame['a_name']).convert('RGBA')
    source = sources[frame['a_name']]
    output = Image.new('RGBA', tuple(frame['size']))
    output.paste(source.crop((x, y, x + w, y + h)), tuple(frame['trim'][:2]))
    output.save(Path('public/assets') / (name + '.png'))
