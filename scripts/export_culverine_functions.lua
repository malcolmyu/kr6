EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db')
for _,name in ipairs({'tower_culverine_lvl1','tower_culverine_lvl2','tower_culverine_lvl3','tower_culverine_lvl4','bullet_culverine_lvl1','bullet_culverine_lvl4','aura_bullet_culverine_lvl1','fx_bullet_culverine_hit'})do
 local e=E:create_entity(name)
 if e then for key,fn in pairs(e.main_script or{})do if type(fn)=='function'then local f=assert(io.open('analysis/function-bytecode/'..name..'_'..key..'.lua','wb'));f:write(string.dump(fn));f:close()end end end
end
