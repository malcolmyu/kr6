"""Decode shipped KTX ETC2 textures to stock-LÖVE PNGs, preserving atlas geometry."""
from pathlib import Path
import concurrent.futures
import shutil
import struct
import lz4.frame
import texture2ddecoder as decoder
from PIL import Image

source = Path('reference/apk/assets')
target = Path('runtime/desktop_assets')

def convert(path):
    out = target / path.relative_to(source)
    out.parent.mkdir(parents=True, exist_ok=True)
    if path.name.endswith('.pkm.lz4'):
        out = out.with_name(out.name.replace('.pkm.lz4', '.png'))
        if out.exists(): return
        data = lz4.frame.decompress(path.read_bytes())
        assert data[:12] == b'\xabKTX 11\xbb\r\n\x1a\n', path
        fields = struct.unpack_from('<13I', data, 12)
        endian, typ, size, fmt, internal, base, w, h, depth, arrays, faces, levels, kv = fields
        assert endian == 0x04030201 and faces == 1 and not arrays, (path, fields)
        offset = 64 + kv
        length, = struct.unpack_from('<I', data, offset)
        payload = data[offset+4:offset+4+length]
        methods = {0x9278: decoder.decode_etc2a8, 0x9274: decoder.decode_etc2,
                   0x9276: decoder.decode_etc2a1, 0x8D64: decoder.decode_etc1}
        rgba = methods[internal](payload, w, h)
        Image.frombytes('RGBA', (w, h), rgba, 'raw', 'BGRA').save(out)
    elif path.suffix == '.lua':
        out.write_bytes(path.read_bytes().replace(b'.pkm.lz4', b'.png'))
    elif not out.exists():
        shutil.copy2(path, out)

if __name__ == '__main__':
    paths = [p for p in source.rglob('*') if p.is_file() and 'gc32' not in p.parts and 'gc64' not in p.parts]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(convert, paths))
    print(f'Prepared {len(paths)} asset files in {target}')
