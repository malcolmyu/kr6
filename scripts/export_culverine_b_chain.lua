local f=assert(io.open('scripts/export_culverine_native_chain.lua'));local source=f:read('*a');f:close()
local function replace(a,b)local first,last=assert(source:find(a,1,true));assert(not source:find(a,last+1,true));source=source:sub(1,first-1)..b..source:sub(last+1)end
replace('e.health.hp=10000;',"e.health.armor=arg[12]=='zero-armor'and 0 or 0.2;e.health.hp=10000;")
replace('t.webCulverineSource=true;',"t.webCulverineSource=true;if arg[12]~='purchase'and arg[12]~='mid-windup'then t.powers.skill_b.level=tonumber(arg[13]);t.powers.skill_b.changed=true end;")
replace("  local mode=arg[12]or'normal'",[[
  if arg[12]=='purchase'and(tick==80 or tick==120 and tonumber(arg[13])>=2 or tick==160 and tonumber(arg[13])>=3)or arg[12]=='mid-windup'and tick==22 then for _,t in pairs(store.entities)do if t.webCulverineSource then t.powers.skill_b.level=t.powers.skill_b.level+1;t.powers.skill_b.changed=true end end end
  local mode=arg[12]or'normal']])
replace('culverineParts=entity.template_name:', 'culverineAllAttacks=entity.template_name:match("^tower_culverine") and table.deepclone(entity.attacks.list),powerB=entity.powers and entity.powers.skill_b and entity.powers.skill_b.level,rawArmor=entity.health and entity.health.raw_armor,culverineParts=entity.template_name:')
assert(loadstring(source,'@scripts/export_culverine_native_chain.lua'))()
