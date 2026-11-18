local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local first,last=assert(source:find("slot.heroes.team={'hero_gerald','hero_zefira'}",1,true));source=source:sub(1,first-1).."slot.heroes.team={'hero_bolin','hero_zefira'}"..source:sub(last+1)
local marker='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(marker,1,true));source=source:sub(1,at-1)..[[
  if tick==20 then
   for _,h in pairs(store.entities)do if h.template_name=='hero_zefira'then h.main_script=nil;h.pos={x=1000,y=650}elseif h.template_name=='hero_bolin'then h.pos={x=450,y=400};h.nav_rally.center={x=450,y=400};h.nav_rally.pos={x=450,y=400};h.motion.dest={x=450,y=400};h.motion.speed={x=0,y=0}end end
   local mode=arg[11]or'normal';local positions={left={x=350,y=400},up={x=450,y=500},down={x=450,y=300},['up-left']={x=400,y=500},['down-left']={x=400,y=300},['no-target']={x=1000,y=650}};local e=E:create_entity('enemy_bandit');e.main_script=nil;e.webBolinTarget=true;e.pos=positions[mode]or{x=550,y=400};e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
  end
  local mode=arg[11]or'normal'
  if tick==20 and runtimeProfile.isolateBolinSkills then for _,h in pairs(store.entities)do if h.template_name=='hero_bolin'then h.timed_attacks.list[1].disabled=true;h.timed_attacks.list[2].disabled=true;h.timed_attacks.list[3].disabled=true end end end
  if tick==21 then for _,e in pairs(store.entities)do if e.webBolinTarget then if mode=='boss'then e.vis.flags=bit.bor(e.vis.flags,F_BOSS)elseif mode=='miniboss'then e.vis.flags=bit.bor(e.vis.flags,F_MINIBOSS)elseif mode=='small'then e.health.hp=800;e.health.hp_max=800 elseif mode=='armor'then e.health.armor=.6 elseif mode=='immune'then e.health.ignore_damage=true end end end end
  if mode=='death'and tick==100 then for _,e in pairs(store.entities)do if e.template_name=='hero_bolin'then e.health.hp=0;e.health.dead=true;e.health.death_ts=store.tick_ts elseif e.webBolinTarget then e.pos={x=500,y=400}end end end
  if mode=='death'and tick==900 then for _,e in pairs(store.entities)do if e.webBolinTarget then e.pos={x=550,y=400}end end end
  local shot=runtimeProfile.isolateBolinSkills and 95 or 102
  if (mode=='remove-before'and tick==shot-1)or(mode=='remove-after'and tick==shot+1)then for _,e in pairs(store.entities)do if e.webBolinTarget then sim:queue_remove_entity(e)end end end
  if mode=='moving'and tick>=100 and tick<250 then for _,e in pairs(store.entities)do if e.webBolinTarget then e.pos.x=e.pos.x+.5 end end end
  if ((mode=='stun-before'and tick==shot-2)or(mode=='stun-after'and tick==shot+8)or(mode=='stun-boundary'and tick==shot))or(mode:find('stun',1,true)and tick==130)then for _,e in pairs(store.entities)do if e.template_name=='hero_bolin'then e.unit.is_stunned=tick~=130 end end end
]]..source:sub(at)
local count;source,count=source:gsub('hp=entity.health and entity.health.hp,','bolinMinesNear=entity.template_name=="hero_bolin"and entity.max_mines_near,bolinTrigger=entity.trigger,bolinAuraLevel=entity.aura and entity.aura.level,bolinMaxSpeed=entity.motion and entity.motion.max_speed,bolinTimedTs=entity.template_name=="hero_bolin"and{entity.timed_attacks.list[1].ts,entity.timed_attacks.list[2].ts,entity.timed_attacks.list[3].ts},bolinRangedTs=entity.template_name=="hero_bolin" and entity.ranged.attacks[1].ts,bolinMeleeTs=entity.template_name=="hero_bolin" and entity.melee.attacks[1].ts,bolinRegen=entity.regen and entity.regen.ts_counter,bolinSprite=entity.render and table.deepclone(entity.render.sprites[1]),bolinSource=entity.source_id,bolinYOrigin=entity.y_origin,bolinTween=entity.tween and {disabled=entity.tween.disabled,ts=entity.tween.ts},hp=entity.health and entity.health.hp,',1);assert(count==1)
local first,last=assert(source:find('local currentStore,activeUpdate',1,true));source=source:sub(1,first-1)..[[local currentStore,activeUpdate
local bolinSounds={};local S=require('sound_db');local oldQueue=S.queue;S.queue=function(self,name,...)local o=select(1,...);bolinSounds[#bolinSounds+1]={tick=currentStore and currentStore.tick or 0,name=name,delay=type(o)=='table'and o.delay or nil};return oldQueue(self,name,...)end
]]..source:sub(last+1)
source=source..[[
local f=assert(io.open('analysis/native-'..arg[4]..'-sounds.json','w'));f:write(dofile('scripts/precise_json.lua')(bolinSounds));f:close()
]]
if BOLIN_CHAIN_TRANSFORM then source=BOLIN_CHAIN_TRANSFORM(source)end
if CONTROLLED_PAINT_TRANSFORM then source=CONTROLLED_PAINT_TRANSFORM(source)end
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
