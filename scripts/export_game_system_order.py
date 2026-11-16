"""Read the original native game chunk's static simulation-system table."""
import hashlib,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/luajit-decompiler'))
from main import set_luajit_version
import ljd.rawdump.parser
source=ROOT/'reference/apk/assets/gc64/all/game.lua'
header,root=ljd.rawdump.parser.parse(str(source),lambda h:set_luajit_version(2.1 if h.version==2 else 2.0))
rows=[c for c in root.constants.complex_constants if type(c).__name__=='Table' and 'main_script' in c.array and 'health' in c.array]
assert len(rows)==1
slots={i:name for i,name in enumerate(rows[0].array) if i>0}
assert next(i for i,n in slots.items()if n=='main_script')<next(i for i,n in slots.items()if n=='health')
(ROOT/'analysis/game-system-order.json').write_text(json.dumps({'source':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'note':'Static original simulation_systems table. Null slots and optional trailing SSO systems are populated by runtime branches; no full dispatcher/SSO equivalence inferred.','slots':slots},indent=2)+'\n')
print('Original game static main_script/health system order exported')
