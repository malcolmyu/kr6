EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db')
for _,name in ipairs({'tower_wizard_lvl4','mod_wizard_skill_b','mod_wizard_skill_b_fx','decal_tower_wizard_skill_b'})do
 local e=E:create_entity(name)
 for key,fn in pairs(e.main_script or{})do if type(fn)=='function'then local f=assert(io.open('analysis/function-bytecode/'..name..'_'..key..'.lua','wb'));f:write(string.dump(fn));f:close()end end
end

local U=require('utils');local f=assert(io.open('analysis/function-bytecode/utils_find_towers.lua','wb'));f:write(string.dump(U.find_towers));f:close()
