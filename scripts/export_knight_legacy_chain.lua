local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('local currentStore,activeUpdate',[[local currentStore,activeUpdate
local legacySounds={};local S=require('sound_db');local queue=S.queue
S.queue=function(self,name,...)legacySounds[#legacySounds+1]={tick=currentStore and currentStore.tick or 0,name=name};return queue(self,name,...)end]],1)
local writeAnchor=assert(source:find("local f=assert(io.open(path,'w'))",1,true));source=source:sub(1,writeAnchor-1)..'result.legacySounds=legacySounds;'..source:sub(writeAnchor)
local replacements;source,replacements=source:gsub('hp=entity.health and entity.health.hp,','nativeTween=entity.tween and table.deepclone(entity.tween),unitDamageFactor=entity.unit and entity.unit.damage_factor,rawArmor=entity.health and entity.health.raw_armor,auraActualDuration=entity.aura and entity.aura.actual_duration,hpBeforeTimeout=entity.reinforcement and entity.reinforcement.hp_before_timeout,modifierLevel=entity.modifier and entity.modifier.level,healthDead=entity.health and entity.health.dead,deathFinished=entity.health and entity.health.death_finished_ts,powerC=entity.powers and entity.powers.skill_c and entity.powers.skill_c.level,legacyAttacks=entity.template_name=="soldier_knights_lvl4" and table.deepclone(entity.melee.attacks),auraSource=entity.aura and entity.aura.source_id,auraTarget=entity.aura and entity.aura.target_id,hp=entity.health and entity.health.hp,',1);assert(replacements==1,'Missing complete snapshot instrumentation anchor')
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
local injected=[[
  if tick==20 then
   for _,h in pairs(store.entities)do if h.hero then h.main_script=nil;h.pos={x=1000,y=650}end end
   local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=550,y=400};e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
   local t=E:create_entity('tower_knights_lvl4');t.pos={x=520,y=400};t.tower.holder_id='legacy-source';t.tower.holder_template='tower_holder_terrain_1_1';t.tower.terrain_style=1;t.barrack.rally_pos={x=520,y=400};t.tower.default_rally_pos={x=520,y=400};t.powers.skill_c.level=(arg[12]=='purchase'or arg[12]=='late')and 0 or tonumber(arg[11]);t.webLegacySource=true;sim:queue_insert_entity(t)
  end
  if arg[12]=='purchase'and(tick==80 or tick==120 and tonumber(arg[11])>=2 or tick==160 and tonumber(arg[11])>=3)then for _,t in pairs(store.entities)do if t.webLegacySource then t.powers.skill_c.level=t.powers.skill_c.level+1;t.powers.skill_c.changed=true end end end
  if tick==300 and arg[12]=='late'then for _,t in pairs(store.entities)do if t.webLegacySource then t.powers.skill_c.level=tonumber(arg[11]);t.powers.skill_c.changed=true end end end
  if tick==200 and(arg[12]=='boundary-in'or arg[12]=='boundary-out')then for _,t in pairs(store.entities)do if t.webLegacySource then local s,c=t.barrack.soldiers[1],t.barrack.soldiers[2];s.pos.x=c.pos.x+100+(arg[12]=='boundary-out'and 0.000000001 or 0);s.pos.y=c.pos.y end end end
  if (tick==200 or tick==500)and not arg[12]:match('^reinforcement')then for _,t in pairs(store.entities)do if t.webLegacySource then local s=t.barrack.soldiers[tick==200 and 1 or 2];local d=E:create_entity('damage');d.source_id=t.id;d.target_id=s.id;d.damage_type=1;d.value=1000;table.insert(store.damage_queue,d)end end end
  if (tick==200 and(arg[12]=='reinforcement-death'or arg[12]=='reinforcement-death-special')or tick==90 and arg[12]=='reinforcement-early-death-special')then for _,e in pairs(store.entities)do if e.reinforcement then local d=E:create_entity('damage');d.source_id=e.id;d.target_id=e.id;d.damage_type=1;d.value=10000;table.insert(store.damage_queue,d)end end end
]]
source=source:sub(1,at-1)..injected..source:sub(at)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
