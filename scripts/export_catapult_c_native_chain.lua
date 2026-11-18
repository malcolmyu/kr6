-- Same actual native fixture, enabling only the original trap power.
local f=assert(io.open('scripts/export_catapult_native_area_chain.lua'));local source=f:read('*a');f:close()
local n;source,n=source:gsub('t.powers.skill_a.level=tonumber%(arg%[13%]%)or 1;t.powers.skill_a.changed=true;','t.powers.skill_c.level=tonumber(arg[13])or 1;t.powers.skill_c.changed=true;',1);assert(n==1)
local marker=' assert(count==1)'
local at=assert(source:find(marker,1,true));source=source:sub(1,at-1)..[[
 local ccount;source,ccount=source:gsub('hp=entity.health and entity.health.hp,','catapultSource=entity.source_id,catapultLevel=entity.modifier and entity.modifier.level,catapultHidden=entity.render and entity.render.sprites[1].hidden or false,catapultActive=entity.active_traps and (function()local a={} for _,t in ipairs(entity.active_traps)do a[#a+1]=t.id end return a end)(),hp=entity.health and entity.health.hp,',1);assert(ccount==1)
]]..source:sub(at)
local before=' return source\nend';local first,last=assert(source:find(before,1,true));source=source:sub(1,first-1)..[[ source=source:gsub('if tick==20 then','if tick==20 then store.wave_group_number=1;',1)
 local marker="  local mode=arg[12]or'normal'"
 local at=assert(source:find(marker,1,true));source=source:sub(1,at-1)..[=[
  if arg[12]:find('trigger',1,true)and tick==400 then
   local trap,enemy,owner
   for _,e in pairs(store.entities)do if e.template_name=='aura_catapult_skill_c_trap'and(not trap or e.id<trap.id)then trap=e end;if e.webCulverineTarget then enemy=e end;if e.webCulverineSource then owner=e end end
   assert(trap and enemy,'Trigger fixture needs a real already-armed trap');enemy.pos.x=trap.pos.x;enemy.pos.y=trap.pos.y
   if arg[12]=='trigger-stun-banned'then enemy.vis.bans=bit.bor(enemy.vis.bans,4194308)end
   if arg[12]=='trigger-boss'then enemy.vis.flags=bit.bor(enemy.vis.flags,32)end
   if arg[12]=='trigger-ignore'then enemy.unit.ignore_stun=true end
   if arg[12]=='trigger-damage-immune'then enemy.health.immune_to=2 end
   if arg[12]:find('overlap',1,true)then local a=E:create_entity('aura_catapult_skill_c_trap');a.pos=table.deepclone(trap.pos);local rank=tonumber(arg[13]);a.aura.level=arg[12]=='trigger-overlap-higher'and math.min(3,rank+1)or arg[12]=='trigger-overlap-lower'and math.max(1,rank-1)or rank;a.source_id=owner.id;sim:queue_insert_entity(a)end
   if arg[12]=='trigger-multi'then for _,delta in ipairs({-5,5,10})do local e=E:create_entity('enemy_bandit');e.main_script=nil;e.webCulverineTarget=true;e.pos={x=trap.pos.x+delta,y=trap.pos.y};e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)end end
  end
  if arg[12]=='trigger-orphan'and tick==180 then for _,e in pairs(store.entities)do if e.webCulverineSource then sim:queue_remove_entity(e)end end end
  if arg[12]=='trigger-leave'and tick==405 then for _,e in pairs(store.entities)do if e.webCulverineTarget then e.pos.x=950;e.pos.y=650 end end end
  if (arg[12]=='trigger-sale'and tick==402)or(arg[12]=='trigger-remove'and tick==405)then for _,e in pairs(store.entities)do if (arg[12]=='trigger-sale'and e.webCulverineSource)or(arg[12]=='trigger-remove'and e.webCulverineTarget)then sim:queue_remove_entity(e)end end end
]=]..source:sub(at)

 return source
end]]..source:sub(last+1)
assert(loadstring(source,'@scripts/export_catapult_native_area_chain.lua'))()
