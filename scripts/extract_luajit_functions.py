"""Extract complete prototype subtrees for focused, read-only decompilation.

Uses the LJD parser to locate original byte ranges; never regenerates instructions.
Usage: python3 scripts/extract_luajit_functions.py INPUT LINE [LINE ...]
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/luajit-decompiler'))
from main import set_luajit_version
import ljd.rawdump.parser
import ljd.rawdump.prototype
from ljd.bytecode.prototype import Prototype

source = pathlib.Path(sys.argv[1])
lines = {int(line) for line in sys.argv[2:]}
raw = source.read_bytes()
records = {}
original_read = ljd.rawdump.prototype.read


def record(parser, prototype):
    begin = parser.stream.pos
    result = original_read(parser, prototype)
    if result:
        records[id(prototype)] = (prototype, begin, parser.stream.pos)
    return result


ljd.rawdump.prototype.read = record
header, root = ljd.rawdump.parser.parse(str(source), lambda h: set_luajit_version(2.1 if h.version == 2 else 2.0))
assert root is not None
prefix = raw[:min(value[1] for value in records.values())]
out = ROOT / 'analysis/function-bytecode'
out.mkdir(exist_ok=True)


def descendants(prototype):
    result = [records[id(prototype)]]
    for constant in prototype.constants.complex_constants:
        if isinstance(constant, Prototype):
            result.extend(descendants(constant))
    return result


for prototype, _, _ in records.values():
    if prototype.first_line_number not in lines:
        continue
    chunks = sorted(descendants(prototype), key=lambda value: value[1])
    target = out / f'{source.stem}_line{prototype.first_line_number}.lua'
    target.write_bytes(prefix + b''.join(raw[begin:end] for _, begin, end in chunks) + b'\x00')
    print(f'{target.name}: {len(chunks)} original prototypes')
