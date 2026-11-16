EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,P,S,A,J=require('entity_db'),require('utils'),require('path_db'),require('sound_db'),require('klove.animation_db'),require('dkjson')
local old={find=U.find_foremost_enemy,predict=P.predict_enemy_pos,positions=P.get_all_valid_pos,sound=S.queue,sim=simulation,random=math.random}
local counts=J.decode(assert(io.open('public/data/catapult-exo-frames.json')):read('*a'));local rows={}
for _,birth in ipairs({0,19})do for scenario=1,18 do
 local t=E:create_entity('tower_catapult_lvl4');t.pos={x=500,y=350};local e=E:create_entity('enemy_bandit');e.pos={x=620,y=470};e.motion.speed={x=0,y=0};e.health.hp=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 local initialLevel=scenario<=3 and scenario or scenario>=13 and 1 or 0;local level=initialLevel;t.powers.skill_c.level=level;t.powers.skill_c.changed=level>0
 if scenario==16 then t.powers.skill_a.level=1;t.powers.skill_a.changed=true;t.powers.skill_b.level=1;t.powers.skill_b.changed=true end
 local store={tick_ts=birth*(1/30),tick=birth,tick_length=1/30,wave_group_number=1,entities={[t.id]=t,[e.id]=e}};local tick=0;local calls,events,frames,choices={},{},{},{}
 local raw={{x=600,y=350},{x=580,y=390},{x=450,y=350}}
 P.predict_enemy_pos=function(_,enemy)return table.deepclone(enemy.pos)end
 U.find_foremost_enemy=function(entities,origin,min,max,pred,flags,bans,filter)local found=scenario==16 and(not filter or filter(e));calls[#calls+1]={at=store.tick_ts,pred=pred,filter=filter~=nil,target=not not found};if found then return e,{e},table.deepclone(e.pos)end end
 P.get_all_valid_pos=function(self,x,y,min,max,terrain,filter)local points={};if scenario~=12 or tick>=91 then for _,p in ipairs(raw)do if filter(p.x,p.y)then points[#points+1]=p end end end;choices[#choices+1]={at=store.tick_ts,points=table.deepclone(points)};return points end
 math.random=function(a,b)if a then return a+math.floor(.5*(b-a+1))end;return .5 end
 simulation={queue_insert_entity=function(_,b)events[#events+1]={at=store.tick_ts,name=b.template_name,pos=table.deepclone(b.pos),to=b.bullet and table.deepclone(b.bullet.to),factor=b.bullet and b.bullet.damage_factor,level=b.bullet and b.bullet.level}end,queue_remove_entity=function()end};S.queue=function()end
 assert(t.main_script.insert(t,store));local co=coroutine.create(t.main_script.update)
 for relative=1,900 do
  tick=relative;store.tick=birth+relative;store.tick_ts=(birth+relative)*(1/30)
  local buy=({[4]=2,[5]=15,[6]=30,[7]=45,[8]=60,[9]=85,[10]=100,[11]=150,[12]=1})[scenario]
  if tick==buy or scenario>=4 and tick==280 or scenario>=4 and tick==400 then level=math.min(3,level+1);t.powers.skill_c.level=level;t.powers.skill_c.changed=true end
  if scenario==18 and tick==10 then level=3;t.powers.skill_c.level=3;t.powers.skill_c.changed=true end
  t.tower.blocked=scenario==15 and(tick<91 or tick>=260 and tick<340)or false
  store.wave_group_number=scenario==14 and tick<91 and 0 or 1
  if scenario==13 and tick>1 then t.active_traps={};if tick>=31 and tick<301 then for i=1,5 do t.active_traps[i]={}end end end
  local mineId=-100;if scenario==10 then store.entities[mineId]=tick>=50 and tick<351 and{template_name='aura_catapult_skill_c_trap',pos={x=600,y=350}}or nil end
  if scenario==17 and tick==181 then t.timed_attacks.list[1].ts=store.tick_ts-1e99 end
  local ok,err=coroutine.resume(co,t,store);assert(ok,debug.traceback(co,tostring(err)));assert(coroutine.status(co)~='dead')
  local parts={};for _,s in ipairs(t.render.sprites)do parts[#parts+1]={name=s.name,ts=s.ts,flip=s.flip_x,loop=s.loop,runs=s.runs}end
  frames[#frames+1]={at=store.tick_ts,parts=parts,attackTs=t.attacks.list[1].ts,explosiveTs=t.attacks.list[3].ts,tarTs=t.attacks.list[2].ts,trapTs=t.timed_attacks.list[1].ts,groupTs=t.attacks.ts,power=level,blocked=not not t.tower.blocked,wave=store.wave_group_number,trapCount=#t.active_traps,mines=store.entities[mineId]and{table.deepclone(store.entities[mineId].pos)}or{}}
  for _,s in ipairs(t.render.sprites)do if s.prefix and counts[s.prefix]and counts[s.prefix][s.name]then local seq={prefix=s.prefix..'_'..s.name,from=1,to=counts[s.prefix][s.name]};local _,runs=A:fni(seq,store.tick_ts-s.ts,s.loop,s.fps,store.tick_length);s.runs=runs end end
 end
 rows[#rows+1]={birth=birth,scenario=scenario,initialLevel=initialLevel,frames=frames,events=events,calls=calls,choices=choices}
end end
U.find_foremost_enemy,P.predict_enemy_pos,P.get_all_valid_pos,S.queue,simulation,math.random=old.find,old.predict,old.positions,old.sound,old.sim,old.random
local f=assert(io.open('analysis/catapult-trap-tower-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' native trap source cases,32400 frames including ammo interaction, capacity/wave/blocked gates and Royal clock reset')
