local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('local currentStore,activeUpdate',[[local currentStore,activeUpdate
local healSounds={};local S=require('sound_db');local queue=S.queue
S.queue=function(self,name,...)healSounds[#healSounds+1]={tick=currentStore and currentStore.tick or 0,name=name};return queue(self,name,...)end]],1)
local writeAnchor=assert(source:find("local f=assert(io.open(path,'w'))",1,true));source=source:sub(1,writeAnchor-1)..'result.healSounds=healSounds;'..source:sub(writeAnchor)
source=source:gsub('hp=entity.health and entity.health.hp,','healthDead=entity.health and entity.health.dead,powerB=entity.powers and entity.powers.skill_b and entity.powers.skill_b.level,healConfig=entity.template_name=="soldier_knights_lvl4" and table.deepclone(entity.timed_attacks.list[1]),hp=entity.health and entity.health.hp,',1)
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
local injected=[[
  if tick==20 then
   for _,h in pairs(store.entities)do if h.hero then h.main_script=nil;h.pos={x=1000,y=650}end end
   local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=550,y=400};e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
   local t=E:create_entity('tower_knights_lvl4');t.pos={x=520,y=400};t.tower.holder_id='heal-source';t.tower.holder_template='tower_holder_terrain_1_1';t.tower.terrain_style=1;t.barrack.rally_pos={x=520,y=400};t.tower.default_rally_pos={x=520,y=400};t.powers.skill_b.level=arg[12]=='initial'and tonumber(arg[11])or 0;t.webHealSource=true;sim:queue_insert_entity(t)
  end
  if arg[12]~='initial'and(tick==80 or tick==120 and tonumber(arg[11])>=2 or tick==160 and tonumber(arg[11])>=3)then for _,t in pairs(store.entities)do if t.webHealSource then t.powers.skill_b.level=t.powers.skill_b.level+1;t.powers.skill_b.changed=true end end end
  if arg[12]=='idle'then for _,e in pairs(store.entities)do if e.template_name=='enemy_bandit'then e.vis.bans=-1 end end end
  if arg[12]=='death-before'or arg[12]=='death-between'then for _,t in pairs(store.entities)do if t.webHealSource then local s=t.barrack.soldiers[1];if s and not s.webHealInterrupted and s.render.sprites[1].name=='heal'and store.tick_ts-s.render.sprites[1].ts>=(arg[12]=='death-before'and .1 or .35)then s.webHealInterrupted=true;local d=E:create_entity('damage');d.source_id=t.id;d.target_id=s.id;d.damage_type=1;d.value=1000;table.insert(store.damage_queue,d)end end end end
  if arg[12]=='stun-before'or arg[12]=='stun-between'or arg[12]=='upgrade-cast'then for _,t in pairs(store.entities)do if t.webHealSource then local s=t.barrack.soldiers[1];if s and not t.webHealControl and s.render.sprites[1].name=='heal'and store.tick_ts-s.render.sprites[1].ts>=(arg[12]=='stun-between'and .35 or .1)then t.webHealControl=true;if arg[12]=='stun-before'or arg[12]=='stun-between'then s.unit.is_stunned=true;s.unit.stun_count=1 else t.powers.skill_b.level=3;t.powers.skill_b.changed=true end end end end end
  if tick==300 and(arg[12]=='stun-before'or arg[12]=='stun-between')then for _,t in pairs(store.entities)do if t.webHealSource then t.barrack.soldiers[1].unit.is_stunned=false;t.barrack.soldiers[1].unit.stun_count=0 end end end
  if tick==215 and arg[12]=='rally-before'or tick==225 and arg[12]=='rally-between'then for _,t in pairs(store.entities)do if t.webHealSource then t.barrack.rally_pos={x=510,y=400};t.barrack.rally_new=true end end end
  if tick==200 or tick==700 then for _,t in pairs(store.entities)do if t.webHealSource then for _,s in ipairs(t.barrack.soldiers)do local d=E:create_entity('damage');d.source_id=t.id;d.target_id=s.id;d.damage_type=1;d.value=60;table.insert(store.damage_queue,d)end end end end
]]
source=source:sub(1,at-1)..injected..source:sub(at)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
