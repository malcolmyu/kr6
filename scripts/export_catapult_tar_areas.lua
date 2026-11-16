EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J=require('entity_db'),require('dkjson');local systems=require('systems');local sim=require('klove.simulation');local previousSimulation=simulation;simulation=sim
local qInsert,qRemove=sim.queue_insert_entity,sim.queue_remove_entity;local rows={}
for _,birth in ipairs({0,19})do for level=1,3 do for mode=1,8 do
 local store={};sim:init(store,systems,{'mod_lifecycle','main_script','tween'},1/30);for i=1,birth do sim:do_tick()end
 local known,auras,events,removals={}, {},{},{};local frame=0;local serial=0
 sim.queue_insert_entity=function(self,e)if e.modifier then serial=serial+1;e.webKey=serial;local t=known[e.modifier.target_id];events[#events+1]={at=store.tick_ts,key=serial,target=t and t.webKey,level=e.modifier.level}end;qInsert(self,e)end
 sim.queue_remove_entity=function(self,e)if e.modifier then removals[#removals+1]={at=store.tick_ts,key=e.webKey,level=e.modifier.level}end;qRemove(self,e)end
 local enemies={}
 for index,delta in ipairs({{0,0},{60,0},{60.001,0},{0,42},{0,0,air=true},{0,0,immune=true},{0,0,invulnerable=true},{0,0,modban=true},{0,0,flag=true}})do
  local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=500+delta[1],y=350+delta[2]};e.health.hp=5000;e.health.hp_max=5000;e.motion.max_speed=60;e.webKey=index;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
  if delta.air then e.vis.flags=bit.bor(e.vis.flags,128)end;if delta.immune then e.vis.bans=bit.bor(e.vis.bans,8)end;if delta.invulnerable then e.motion.invulnerable=true end;if delta.modban then e.vis.bans=bit.bor(e.vis.bans,4)end;if delta.flag then e.vis.flags=bit.bor(e.vis.flags,1024)end
  enemies[index]=e;known[e.id]=e;sim:queue_insert_entity(e)
 end
 local function add(rank)local a=E:create_entity('aura_catapult_skill_a');a.pos={x=500,y=350};a.aura.level=rank;a.source_id=-1;a.webKey=#auras+1;auras[#auras+1]=a;sim:queue_insert_entity(a);return a end
 local first=add(level);local frames={}
 for tick=1,420 do
  frame=tick
  if mode==2 then enemies[1].pos.x=tick>=31 and tick<61 and 900 or 500 end
  if mode==3 and tick==31 then enemies[1].health.dead=true;enemies[1].health.hp=0 end
  if mode==4 then enemies[1].vis.bans=tick<31 and 8 or 0 end
  if mode>=5 and mode<=7 and tick==31 then add(mode==5 and level or mode==6 and math.min(3,level+1)or math.max(1,level-1))end
  if mode==8 and(tick==31 or tick==61)then enemies[1].motion.max_speed=enemies[1].motion.max_speed*(tick==31 and .4 or 2.5)end
  sim:do_tick()
  local mods,areaStates,speeds={},{},{}
  for _,e in pairs(store.entities)do if e.modifier then mods[#mods+1]={key=e.webKey,target=known[e.modifier.target_id].webKey,at=e.modifier.ts,level=e.modifier.level,factor=e.slow.factor,pending=e.pending_removal or false}end end
  table.sort(mods,function(a,b)return a.key<b.key end)
  for _,a in ipairs(auras)do local s=a.render.sprites[1];areaStates[#areaStates+1]={key=a.webKey,level=a.aura.level,active=store.entities[a.id]~=nil,at=a.aura.ts,spriteAt=s.ts,alpha=s.alpha,fadeAt=not a.tween.disabled and a.tween.ts or nil,pending=a.pending_removal or false};assert(not store.entities[a.id]or a.main_script.co or not a.tween.disabled or a.pending_removal,'native tar aura coroutine failed')end
  for _,e in ipairs(enemies)do speeds[#speeds+1]=e.motion.max_speed end
  frames[#frames+1]={at=store.tick_ts,speeds=speeds,mods=mods,areas=areaStates}
 end
 rows[#rows+1]={birth=birth,level=level,mode=mode,frames=frames,events=events,removals=removals}
 sim.queue_insert_entity,sim.queue_remove_entity=qInsert,qRemove
end end end
simulation=previousSimulation
local f=assert(io.open('analysis/catapult-tar-areas-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' native tar aura/mod/tween traces,20160 simulation frames')
