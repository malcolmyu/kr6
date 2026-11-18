EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local SU=require('script_utils');local f=assert(io.open('analysis/function-bytecode/culverine_delay_attack.lua','wb'));f:write(string.dump(SU.delay_attack));f:close()
