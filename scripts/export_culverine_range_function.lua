EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local U=require('utils');local f=assert(io.open('analysis/function-bytecode/culverine_find_enemies_in_range.lua','wb'));f:write(string.dump(U.find_enemies_in_range));f:close()
