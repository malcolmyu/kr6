CULVERINE_CHAIN_TRANSFORM=function(source)
 local count
 source,count=source:gsub('hp=entity.health and entity.health.hp,','tarSpeed=entity.motion and entity.motion.max_speed,tarSlow=entity.slow and entity.slow.factor,tarTween=entity.template_name=="aura_catapult_skill_a" and {disabled=entity.tween.disabled,ts=entity.tween.ts,reverse=entity.tween.reverse},hp=entity.health and entity.health.hp,',1)
 assert(count==1)
 local anchor="  local mode=arg[12]or'normal'"
 local at=assert(source:find(anchor,1,true));source=source:sub(1,at-1)..[[
  if (arg[12]=='sale-after-tar' or arg[12]=='remove-target-after-tar')and tick==670 then
   for _,e in pairs(store.entities)do if (arg[12]=='sale-after-tar' and e.webCulverineSource)or(arg[12]=='remove-target-after-tar'and e.webCulverineTarget)then sim:queue_remove_entity(e)end end
  end
  if arg[12]=='cluster'and tick==20 then
   for _,delta in ipairs({-5,5,10})do
    local e=E:create_entity('enemy_bandit');e.main_script=nil;e.webCulverineTarget=true;e.pos={x=550+delta,y=400};e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
   end
  end
]]..source:sub(at)
 if arg[12]=='aligned'then
  local first,last=assert(source:find('e.pos={x=550,y=400}',1,true));source=source:sub(1,first-1)..'e.pos={x=570,y=358}'..source:sub(last+1)
 end
 if arg[14]=='sounds'then
  local first,last=assert(source:find('local currentStore,activeUpdate',1,true))
  source=source:sub(1,first-1)..[[local currentStore,activeUpdate
local catapultSounds={};local Sound=require('sound_db');local oldSoundQueue=Sound.queue
Sound.queue=function(self,name,...)catapultSounds[#catapultSounds+1]={tick=currentStore and currentStore.tick or 0,name=name};return oldSoundQueue(self,name,...)end
]]..source:sub(last+1)
  source=source..[[
local f=assert(io.open('analysis/native-'..arg[4]..'-sounds.json','w'));f:write(J.encode(catapultSounds));f:close()
]]
 end
 return source
end
local f=assert(io.open('scripts/export_culverine_native_chain.lua'));local source=f:read('*a');f:close()
local first,last=assert(source:find("E:create_entity('tower_culverine_lvl'..arg[11])",1,true));source=source:sub(1,first-1).."E:create_entity('tower_catapult_lvl4')"..source:sub(last+1)
local count;source,count=source:gsub('t.webCulverineSource=true;',"t.webCulverineSource=true;t.powers.skill_a.level=tonumber(arg[13])or 1;t.powers.skill_a.changed=true;",1);assert(count==1)
assert(loadstring(source,'@scripts/export_culverine_native_chain.lua'))()
