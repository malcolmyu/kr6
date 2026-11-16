TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,S,P,G,A,Sound,U=require('entity_db'),require('dkjson'),require('systems'),require('path_db'),require('grid_db'),require('klove.animation_db'),require('sound_db'),require('utils');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
G:load('level03');P:load('level03',{left=-512/3,right=1024+512/3,bottom=0,top=768});G.cell_type=function()return TERRAIN_LAND end
local counts=J.decode(assert(io.open('public/data/soldier-animation-frames.json')):read('*a'));local rows={}
for rank=1,4 do for _,birth in ipairs({0,19})do for scenario=1,8 do
 E.last_id=1;local store={tick=birth,tick_ts=birth*(1/30),tick_length=1/30,entities={},damage_queue={},player_gold=0,gems_collected=0,wave_group_number=1,level_mode=3};local events,frames,inputs={},{},{}
 Sound.queue=function(_,name)if name then events[#events+1]={tick=store.tick,kind='sound',name=name}end end;Sound.stop=function(_,name)if name then events[#events+1]={tick=store.tick,kind='stop',name=name}end end
 simulation={queue_insert_entity=function()end,queue_remove_entity=function()end}
 local tower=E:create_entity('tower_knights_lvl'..rank);tower.barrack.rally_pos={x=600,y=350};tower.main_script=nil;store.entities[tower.id]=tower
 local soldiers,cos,enemies={},{},{}
 for i=1,3 do local s=E:create_entity('soldier_knights_lvl'..rank);s.webKey='s'..i;s.pos={x=500+i*5,y=450+(i-2)*8};s.nav_rally.pos,s.nav_rally.center=U.rally_formation_position(i,tower.barrack,3,0);s.nav_rally.new=true;s.soldier.tower_id=tower.id;s.soldier.tower_soldier_idx=i;s.health.hp=s.health.hp_max;assert(s.main_script.insert(s,store));s.render.sprites[1].ts=store.tick_ts;store.entities[s.id]=s;soldiers[i]=s;cos[i]=coroutine.create(s.main_script.update)end
 for i=1,3 do local e=E:create_entity('enemy_bandit');e.webKey='e'..i;e.main_script=nil;e.pos={x=650+i*3,y=350+(i-2)*12};e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=101-i;e.health.hp=10000;e.health.hp_max=10000;e.heading={angle=math.pi};e.motion.speed={x=-40,y=0};store.entities[e.id]=e;enemies[i]=e end
 local calls=0;math.random=function(a,b)calls=calls+1;local v=scenario==8 and({.91,.21,.81,.31,.71,.41,.61,.51})[(calls-1)%8+1]or .25;if a and not b then return 1+math.floor(v*a)end;return a and a+math.floor(v*(b-a+1))or v end
 for relative=1,120 do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
  if scenario==2 or scenario==4 or scenario==6 or scenario==7 then for i,e in ipairs(enemies)do e.pos.x=(scenario==2 and relative>=20 and 650 or 750)+i*3 end end
  if scenario==3 and relative==3 or scenario==4 and relative==20 or scenario==5 and relative==80 then
   tower.barrack.rally_pos={x=620,y=380};inputs[#inputs+1]={tick=store.tick,kind='rally',pos=table.clone(tower.barrack.rally_pos)}
   for i,s in ipairs(soldiers)do s.nav_rally.pos,s.nav_rally.center=U.rally_formation_position(i,tower.barrack,3,0);s.nav_rally.new=true end
  end
  for i,s in ipairs(soldiers)do local ok,err=coroutine.resume(cos[i],s,store);assert(ok,debug.traceback(cos[i],tostring(err)))end
  if scenario==7 and(relative==2 or relative==10 or relative==40 or relative==100)then local d=E:create_entity('damage');d.target_id=soldiers[1].id;d.value=10;d.damage_type=DAMAGE_PHYSICAL;table.insert(store.damage_queue,d);inputs[#inputs+1]={tick=store.tick,kind='damage',target='s1',value=10}end
  S.health:on_update(1/30,store.tick_ts,store);S.pops:on_update(1/30,store.tick_ts,store)
  local units,actors={},{}
  for _,s in ipairs(soldiers)do local p=s.render.sprites[1];local _,runs,frame=A:fni({from=1,to=counts[p.prefix][p.name],prefix='original'},store.tick_ts-p.ts,p.loop,p.fps,store.tick_length);p.runs=runs;p.frame_idx=frame;units[#units+1]={key=s.webKey,pos=table.clone(s.pos),hp=s.health.hp,target=s.soldier.target_id and store.entities[s.soldier.target_id].webKey,animation=p.name,ts=p.ts,loop=p.loop,frame=frame,flip=p.flip_x,bans=s.vis.bans,immune=s.health.immune_to,rallyNew=s.nav_rally.new,first=s.nav_rally._first_time,arrived=s.motion.arrived,attackTs=s.melee.attacks[1].ts}end
  for _,e in ipairs(enemies)do local blockers={};for _,id in ipairs(e.enemy.blockers)do blockers[#blockers+1]=store.entities[id].webKey end;actors[#actors+1]={hp=e.health.hp,blockers=blockers}end
  frames[#frames+1]={tick=store.tick,units=units,enemies=actors,calls=calls}
 end
 rows[#rows+1]={rank=rank,birth=birth,scenario=scenario,inputs=inputs,frames=frames,events=events}
end end end
local f=assert(io.open('analysis/knight-deployment-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original full three-knight new-rally cases /7680frames exported; fixed land, stationary enemies, explicit initial sprite phase')
