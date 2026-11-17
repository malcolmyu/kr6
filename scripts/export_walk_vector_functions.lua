EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local U=require('utils');local V
for i=1,30 do local n,v=debug.getupvalue(U.walk,i);if not n then break end;if n=='V'then V=v end end
assert(V)
for _,name in ipairs({'normalize','rotate','len','mul','angleTo'})do local f=assert(io.open('analysis/function-bytecode/walk_vector_'..name..'.lua','wb'));f:write(string.dump(V[name]));f:close()end
