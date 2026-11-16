EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,U,A=require('entity_db'),require('dkjson'),require('utils'),require('klove.animation_db');local systems=require('systems');local sim=require('klove.simulation');local S=require('sound_db');local previousSimulation=simulation;simulation=sim
local P=require('path_db');local oldNode=P.is_node_valid;P.is_node_valid=function()return true end
local qRemove,oldSound,oldHealth=sim.queue_remove_entity,S.queue,systems.health.on_update
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local rows={}
for _,birth in ipairs({0,19,350})do for level=1,3 do for mode=1,3 do
 local store={};sim:init(store,systems,{'main_script','health'},1/30);for i=1,birth do sim:do_tick()end
 local enemies,damages,sounds,seenDamage={},{},{},{};local removed
 for index,delta in ipairs({{0,0},{35,0},{70,0},{70.001,0},{0,49},{0,48.999},{30,20},{0,0,air=true},{0,0,immune=true},{0,0,armor=true},{0,0,dead=true}})do
  local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=500+delta[1],y=350+delta[2]};e.health.hp=5000;e.health.hp_max=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
  if delta.air then e.vis.flags=bit.bor(e.vis.flags,128)end;if delta.immune then e.vis.bans=bit.bor(e.vis.bans,8)end;if delta.armor then e.health.armor=.5 end;if delta.dead then e.health.dead=true;e.health.hp=0 end
  e.webKey=index;enemies[index]=e;sim:queue_insert_entity(e)
 end
 local aura=E:create_entity('aura_catapult_skill_b_bomb');aura.pos={x=500,y=350};aura.aura.level=level;aura.source_id=-1;sim:queue_insert_entity(aura)
 systems.health.on_update=function(...)for _,d in ipairs(store.damage_queue)do if not seenDamage[d]then seenDamage[d]=true;local e=store.entities[d.target_id];damages[#damages+1]={at=store.tick_ts,target=e and e.webKey,value=d.value,type=d.damage_type}end end;return oldHealth(...)end
 sim.queue_remove_entity=function(self,e)if e==aura then removed=store.tick_ts end;qRemove(self,e)end
 S.queue=function(_,name)sounds[#sounds+1]={at=store.tick_ts,name=name}end
 local frames={}
 for tick=1,55 do
  if mode==2 and tick==6 then enemies[1].pos.x=600;enemies[4].pos.x=500 end
  if mode==3 and tick==8 then enemies[2].health.dead=true;enemies[2].health.hp=0 end
  local s=aura.render.sprites[1];local a=art.animations[s.prefix..'_'..s.name];local _,runs,index=A:fni(a,(store.tick+1)*(1/30)-s.ts,s.loop,s.fps,1/30);s.runs=runs;s.frame_idx=index
  sim:do_tick();assert(not store.entities[aura.id]or aura.main_script.co or removed,'native bomb coroutine failed')
  local hp={};for _,e in ipairs(enemies)do hp[#hp+1]=e.health.hp end
  frames[#frames+1]={at=store.tick_ts,name=s.name,spriteAt=s.ts,loop=s.loop,runs=s.runs,active=store.entities[aura.id]~=nil,pending=aura.pending_removal or false,hp=hp}
 end
 assert(#damages>0,'native delayed explosion must damage targets')
 rows[#rows+1]={birth=birth,level=level,mode=mode,frames=frames,damages=damages,sounds=sounds,removedAt=removed}
 systems.health.on_update,sim.queue_remove_entity,S.queue=oldHealth,qRemove,oldSound
end end end
simulation=previousSimulation;P.is_node_valid=oldNode
local f=assert(io.open('analysis/catapult-bomb-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' native delayed powerball explosions,1485 simulation frames including queued health')
