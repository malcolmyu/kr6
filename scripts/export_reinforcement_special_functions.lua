EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db')
for _,name in ipairs({'soldier_reinforcement_special','decal_power_reinforcements_special','aura_power_reinforcement_special','mod_reinforcement_special_damage','mod_reinforcement_special_armor'})do
 local e=E:create_entity(name)
 for key,fn in pairs(e.main_script or{})do if type(fn)=='function'then local f=assert(io.open('analysis/function-bytecode/'..name..'_'..key..'.lua','wb'));f:write(string.dump(fn));f:close()end end
 if name=='mod_reinforcement_special_armor'then
  for i=1,12 do local n,v=debug.getupvalue(e.main_script.remove,i);if n=='scripts'then
   for key,fn in pairs({base_armor_remove=v.mod_armor_buff.remove,reverse_remove=v.tween_utils.reverse_remove})do local f=assert(io.open('analysis/function-bytecode/reinforcement_'..key..'.lua','wb'));f:write(string.dump(fn));f:close()end
  end end
 end
end
