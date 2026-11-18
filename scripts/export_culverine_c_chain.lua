local f=assert(io.open('scripts/export_culverine_native_chain.lua'));local source=f:read('*a');f:close()
local function replace(a,b)local first,last=assert(source:find(a,1,true));assert(not source:find(a,last+1,true));source=source:sub(1,first-1)..b..source:sub(last+1)end
replace('t.webCulverineSource=true;',"t.webCulverineSource=true;t.powers.skill_c.level=arg[12]=='purchase'and 0 or tonumber(arg[13]);t.powers.skill_c.changed=arg[12]~='purchase';if arg[12]=='b-combo'then t.powers.skill_b.level=1;t.powers.skill_b.changed=true end;")
replace('culverineParts=entity.template_name:', 'culverineAllAttacks=entity.template_name:match("^tower_culverine") and table.deepclone(entity.attacks.list),culverineTimedAttacks=entity.timed_attacks and table.deepclone(entity.timed_attacks.list),powerC=entity.powers and entity.powers.skill_c and entity.powers.skill_c.level,nativeTween=entity.tween and table.deepclone(entity.tween),spriteZ=entity.render and entity.render.sprites[1]and entity.render.sprites[1].z,culverineParts=entity.template_name:')
replace("  local mode=arg[12]or'normal'",[[
  if arg[12]=='purchase'and(tick==80 or tick==120 and tonumber(arg[13])>=2 or tick==160 and tonumber(arg[13])>=3)then for _,t in pairs(store.entities)do if t.webCulverineSource then t.powers.skill_c.level=t.powers.skill_c.level+1;t.powers.skill_c.changed=true end end end
  if tick==100 and arg[12]=='throttle-upgrade'then for _,t in pairs(store.entities)do if t.webCulverineSource then t.powers.skill_c.level=3;t.powers.skill_c.changed=true end end end
  if(tick==113 and arg[12]=='throttle-remove-source')or(tick==90 and arg[12]=='throttle-remove-early')then for _,t in pairs(store.entities)do if t.webCulverineSource then sim:queue_remove_entity(t)end end end
  if tick==112 and arg[12]=='throttle-remove-target'then for _,t in pairs(store.entities)do if t.webCulverineTarget then sim:queue_remove_entity(t)end end end
  if(arg[12]=='throttle-block-prep'and(tick==90 or tick==160))or(arg[12]=='throttle-block-shot'and(tick==112 or tick==160))then for _,t in pairs(store.entities)do if t.webCulverineSource then t.tower.blocked=tick~=160 end end end
  if tick==100 and arg[12]=='throttle-target-gap'then for _,t in pairs(store.entities)do if t.webCulverineTarget then sim:queue_remove_entity(t)end end end
  if tick==200 and arg[12]=='throttle-target-gap'then local e=E:create_entity('enemy_bandit');e.main_script=nil;e.webCulverineTarget=true;e.pos={x=550,y=400};e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)end
  local mode=arg[12]or'normal']])
replace("assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()", "source=dofile('scripts/instrument_culverine_c_sounds.lua')(source);assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()")
assert(loadstring(source,'@scripts/export_culverine_native_chain.lua'))()
