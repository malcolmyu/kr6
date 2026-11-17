EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local e=require('entity_db'):create_entity('bullet_zefira');local fn=e.main_script.insert;local scripts
for i=1,30 do local n,v=debug.getupvalue(fn,i);if not n then break end;if n=='scripts'then scripts=v end end
assert(scripts and scripts.bolt.insert)
local f=assert(io.open('analysis/function-bytecode/hero_bolt_base_insert.lua','wb'));f:write(string.dump(scripts.bolt.insert));f:close()
