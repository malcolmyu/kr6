EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,P,S,A,J=require('entity_db'),require('utils'),require('path_db'),require('sound_db'),require('klove.animation_db'),require('dkjson')
local old={find=U.find_foremost_enemy,predict=P.predict_enemy_pos,sound=S.queue,sim=simulation}
local definitions,counts={},{ }
for level=1,4 do for _,suffix in ipairs({'','_rocky',level==4 and'_balls'or''})do
 local prefix='tower_catapult_level_'..level..suffix..'Def'
 if not definitions[prefix]then local def=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/go_towers_catapult/'..prefix..'.exo3');definitions[prefix]=def;counts[prefix]={};for _,ani in ipairs(def.animations)do counts[prefix][ani.name]=#ani.frames end end
end end
local f=assert(io.open('public/data/catapult-exo-frames.json','w'));f:write(J.encode(counts));f:close()
local rows={};local angles={{120,120},{120,-120},{-120,-120},{-120,120}}
for level=1,4 do for _,birth in ipairs({0,19})do for scenario=1,9 do
 local t=E:create_entity('tower_catapult_lvl'..level);t.pos={x=500,y=350}
 local e=E:create_entity('enemy_bandit');local delta=angles[(scenario-1)%4+1];e.pos={x=500+delta[1],y=350+delta[2]};e.motion.speed={x=0,y=0};e.health.hp=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 local other=E:create_entity('enemy_bandit');other.pos={x=e.pos.x+10,y=e.pos.y-10};other.motion.speed={x=0,y=0};other.health.hp=5000;other.nav_path.pi=1;other.nav_path.spi=1;other.nav_path.ni=99
 local store={tick_ts=birth*(1/30),tick=birth,tick_length=1/30,wave_group_number=1,entities={[t.id]=t,[e.id]=e,[other.id]=other}}
 local tick=0;local calls,events={},{ }
 P.predict_enemy_pos=function(_,enemy,dt)return{x=enemy.pos.x+enemy.motion.speed.x*dt,y=enemy.pos.y+enemy.motion.speed.y*dt}end
 U.find_foremost_enemy=function(entities,origin,min,max,pred,flags,bans,filter)
  local found={};local unavailable=scenario==5 and(tick<30 or tick>=240 and tick<350)or scenario==6 and tick>=20 and tick<100
  for _,enemy in ipairs({e,other})do if not unavailable and(scenario>=8 or enemy==e)and(enemy.health.hp>0)and(not filter or filter(enemy))then local pos=P:predict_enemy_pos(enemy,pred==true and 1 or pred or 0);if U.is_inside_ellipse(pos,origin,max)then found[#found+1]=enemy end end end
  calls[#calls+1]={at=store.tick_ts,pred=pred,filter=filter~=nil,target=found[1]and(found[1]==e and'first'or'second')}
  if not found[1]then return end;return found[1],found,P:predict_enemy_pos(found[1],pred==true and 1 or pred or 0)
 end
 simulation={queue_insert_entity=function(_,entity)events[#events+1]={at=store.tick_ts,name=entity.template_name,pos=table.deepclone(entity.pos),to=entity.bullet and table.deepclone(entity.bullet.to),factor=entity.bullet and entity.bullet.damage_factor}end,queue_remove_entity=function()end}
 S.queue=function(_,name)if name then events[#events+1]={at=store.tick_ts,sound=name}end end
 assert(t.main_script.insert(t,store));local co=coroutine.create(t.main_script.update);local frames={}
 for relative=1,540 do
  tick=relative;store.tick=birth+relative;store.tick_ts=(birth+relative)*(1/30)
  if scenario==6 then e.pos.x=tick>=20 and 380 or 620;e.pos.y=tick>=20 and 470 or 230 end
  if scenario==7 then e.motion.speed={x=0,y=tick<50 and 80 or 0}end
  if scenario==8 then e.pos.x=tick>=20 and 380 or 620;other.pos.x=620 end
  if scenario==9 then t.tower.blocked=tick>=10 and tick<90 or tick>=310 and tick<370 end
  local ok,err=coroutine.resume(co,t,store);assert(ok,debug.traceback(co,tostring(err)))
  local parts={};for _,s in ipairs(t.render.sprites)do parts[#parts+1]={name=s.name,ts=s.ts,flip=s.flip_x,loop=s.loop,fps=s.fps,runs=s.runs}end
  frames[#frames+1]={at=store.tick_ts,parts=parts,attackTs=t.attacks.list[1].ts,first={pos=table.deepclone(e.pos),speed=table.deepclone(e.motion.speed)},second={pos=table.deepclone(other.pos),speed=table.deepclone(other.motion.speed)},blocked=not not t.tower.blocked}
  for _,s in ipairs(t.render.sprites)do if s.prefix and counts[s.prefix]and counts[s.prefix][s.name]then local sequence={prefix=s.prefix..'_'..s.name,from=1,to=counts[s.prefix][s.name]};local _,runs,index=A:fni(sequence,store.tick_ts-s.ts,s.loop,s.fps,store.tick_length);s.runs=runs;s.frame_idx=index end end
 end
 rows[#rows+1]={level=level,birth=birth,scenario=scenario,frames=frames,events=events,calls=calls}
end end end
U.find_foremost_enemy,P.predict_enemy_pos,S.queue,simulation=old.find,old.predict,old.sound,old.sim
f=assert(io.open('analysis/catapult-tower-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' native catapult basic cases, 38880 script frames with original animation_db.fni completion; target candidate filtering/path prediction isolated')

local samples={}
for _,count in ipairs({1,30,32,34,61,62})do for _,fps in ipairs({30,40})do for _,loop in ipairs({false,true})do for _,elapsed in ipairs({0,1/30,.1,.325,.725,(count-1)/fps,count/fps,count/fps-1e-10,2*count/fps+.01})do
 local sequence={prefix='sample',from=1,to=count};local _,runs,index=A:fni(sequence,elapsed,loop,fps,1/30);samples[#samples+1]={count=count,fps=fps,loop=loop,elapsed=elapsed,runs=runs,index=index}
end end end end
f=assert(io.open('analysis/catapult-animation-oracle.json','w'));f:write(J.encode(samples));f:close()
