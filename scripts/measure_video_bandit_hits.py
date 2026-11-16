"""Measure reference pixels with original atlas templates; no game inputs/HP edits.

Masked image error is a localization aid, not proof of persistent actor identity.
Only the inferred leading lower-road bandit's neighborhood is searched.
"""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

atlas = json.loads(Path('public/data/enemies-atlas.json').read_text())
for frame in list(atlas.values()):
    for alias in frame['alias']:
        atlas[alias] = frame
animations = json.loads(Path('public/data/enemies-animations.json').read_text())
sheet = Image.open('public/assets/go_enemies_T1-1.png').convert('RGBA')
native = json.loads(Path('analysis/level-entity-bootstrap-3-iron-cleared-video-opening-runtime-lcg104.json').read_text())
number = lambda value: float(value[5:]) if isinstance(value, str) and value.startswith('@f64:') else value
scale = .9375
templates = []
seen = set()
for name in ['bandit_walkingRightLeft']:
    animation = animations[name]
    for index in range(animation['from'], animation['to'] + 1):
        frame = atlas[f"{animation['prefix']}_{index:04d}"]
        if tuple(frame['f_quad']) in seen:
            continue
        seen.add(tuple(frame['f_quad']))
        x, y, w, h = frame['f_quad']
        image = sheet.crop((x, y, x + w, y + h)).resize((round(w * scale / 2), round(h * scale / 2)), Image.Resampling.BILINEAR)
        for flip in [False, True]:
            sprite = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else image
            offset_x = (frame['size'][0] / 2 - frame['trim'][0] - w if flip else frame['trim'][0] - frame['size'][0] / 2) * scale / 2
            templates.append((index, frame, sprite.convert('RGB'), sprite.getchannel('A').point(lambda a: 255 if a > 220 else 0), flip, offset_x))
rows = []
for media, suffix in [(74.5, '074.50'), (75, '075'), (75.5, '075.50')]:
    image = Image.open(f'analysis/video-iron/page06-{suffix}s.png').convert('RGB')
    tick = round((media - 13.5) * 30)
    entity = next(e for e in native['frames'][tick - 1]['entities'] if e['id'] == 90)
    anchor = ((number(entity['pos']['x']) + 512 / 3) * scale, (768 - number(entity['pos']['y'])) * scale)
    best = None
    for index, frame, template, mask, flip, offset_x in templates:
        expected_x = round(anchor[0] + offset_x)
        expected_y = round(anchor[1] + (frame['trim'][1] - frame['size'][1] / 2) * scale / 2)
        w, h = template.size
        for y in range(expected_y - 12, expected_y + 13):
            for x in range(expected_x - 24, expected_x + 25):
                error = sum(ImageStat.Stat(ImageChops.difference(image.crop((x, y, x + w, y + h)), template), mask).mean) / 3
                if best is None or error < best['maskedMeanAbsoluteError']:
                    best = dict(frame=index, flip=flip, box=[x, y, w, h], maskedMeanAbsoluteError=error, anchor=[x - offset_x, y - (frame['trim'][1] - frame['size'][1] / 2) * scale / 2])
    # Health bars have native small size16×2 and offset(0,32). Read both
    # scanlines so compression/fade do not become a false exact-HP assertion.
    bar_x, bar_y = best['anchor'][0] - 8 * scale, best['anchor'][1] - 32 * scale
    pixels = [[image.getpixel((x, y)) for x in range(round(bar_x), round(bar_x) + 16)] for y in range(round(bar_y), round(bar_y) + 2)]
    rows.append(dict(media=media, nativeAnchor=anchor, nativeHp=entity['hp'], videoMatch=best, predictedBar=[bar_x, bar_y], barPixels=pixels))
    print(media, 'nativeHP', entity['hp'], 'video locator', best, 'bar', [bar_x, bar_y], flush=True)
Path('analysis/video-bandit-hit-pixels.json').write_text(json.dumps(dict(note='Atlas-assisted pixel measurements, not identified actors, exact video HP or game acceptance.', rows=rows), indent=2) + '\n')
