-- Retain every original sample/frame and additionally record the original
-- particle's actual sprite-sheet frame name for browser atlas verification.
local f=assert(io.open('scripts/export_native_scene_paint.lua'));local source=f:read('*a');f:close()
local anchor="name=e.template_name}end end end"
local a,b=assert(source:find(anchor,1,true));assert(not source:find(anchor,b+1,true))
source=source:sub(1,a-1).."name=e.template_name,atlasFrame=p.f.ss and p.f.ss.webName}end end end"..source:sub(b+1)
assert(loadstring(source,'@scripts/export_native_scene_paint.lua'))()
