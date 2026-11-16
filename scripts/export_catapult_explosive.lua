EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,P,S,A,J=require('entity_db'),require('utils'),require('path_db'),require('sound_db'),require('klove.animation_db'),require('dkjson')
local old={find=U.find_foremost_enemy,predict=P.predict_enemy_pos,sound=S.queue,sim=simulation}
local counts=J.decode(assert(io.open('public/data/catapult-exo-frames.json')):read('*a'))
local rows={}
for _,birth in ipairs({0,19})do for scenario=1,16 do
 local t=E:create_entity('tower_catapult_lvl4');t.pos={x=500,y=350};local e=E:create_entity('enemy_bandit');e.pos={x=620,y=470};e.motion.speed={x=0,y=0};e.health.hp=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 if scenario>=13 then local d=({{120,120},{120,-120},{-120,-120},{-120,120}})[scenario-12];e.pos={x=500+d[1],y=350+d[2]}end
 local initialLevel=scenario<=3 and scenario or scenario>=13 and 1 or 0;local level=initialLevel;t.powers.skill_b.level=level;t.powers.skill_b.changed=level>0
 local store={tick_ts=birth*(1/30),tick=birth,tick_length=1/30,wave_group_number=1,entities={[t.id]=t,[e.id]=e}};local tick=0;local calls,events,frames={},{},{}
 P.predict_enemy_pos=function(_,enemy,dt)return{x=enemy.pos.x+enemy.motion.speed.x*dt,y=enemy.pos.y+enemy.motion.speed.y*dt}end
 U.find_foremost_enemy=function(entities,origin,min,max,pred,flags,bans,filter)
  local unavailable=scenario==11 and(tick<70 or tick>=250 and tick<360)
  local target=not unavailable and(not filter or filter(e))and U.is_inside_ellipse(P:predict_enemy_pos(e,pred or 0),origin,max)and e or nil
  calls[#calls+1]={at=store.tick_ts,pred=pred,filter=filter~=nil,target=target~=nil}
  if target then return target,{target},P:predict_enemy_pos(target,pred or 0)end
 end
 simulation={queue_insert_entity=function(_,b)events[#events+1]={at=store.tick_ts,name=b.template_name,pos=table.deepclone(b.pos),to=b.bullet and table.deepclone(b.bullet.to),factor=b.bullet and b.bullet.damage_factor,level=b.bullet and b.bullet.level}end,queue_remove_entity=function()end}
 S.queue=function(_,name)if name then events[#events+1]={at=store.tick_ts,sound=name}end end
 assert(t.main_script.insert(t,store));local co=coroutine.create(t.main_script.update)
 for relative=1,650 do
  tick=relative;store.tick=birth+relative;store.tick_ts=(birth+relative)*(1/30)
  local buy=({[4]=2,[5]=15,[6]=60,[7]=85,[8]=110,[9]=145,[10]=200,[11]=1,[12]=10})[scenario]
  if tick==buy or scenario>=4 and tick==280 or scenario>=4 and tick==400 then level=math.min(3,level+1);t.powers.skill_b.level=level;t.powers.skill_b.changed=true end
  if scenario==12 then t.tower.blocked=tick>=5 and tick<90 or tick>=260 and tick<340 end
  if scenario==10 then e.pos=tick>=160 and{x=380,y=230}or{x=620,y=470}end
  local ok,err=coroutine.resume(co,t,store);assert(ok,debug.traceback(co,tostring(err)));assert(coroutine.status(co)~='dead')
  local parts={};for _,s in ipairs(t.render.sprites)do parts[#parts+1]={name=s.name,ts=s.ts,flip=s.flip_x,loop=s.loop,runs=s.runs}end
  frames[#frames+1]={at=store.tick_ts,parts=parts,attackTs=t.attacks.list[1].ts,explosiveTs=t.attacks.list[3].ts,power=level,pos=table.deepclone(e.pos),blocked=not not t.tower.blocked}
  for _,s in ipairs(t.render.sprites)do if s.prefix and counts[s.prefix]and counts[s.prefix][s.name]then local seq={prefix=s.prefix..'_'..s.name,from=1,to=counts[s.prefix][s.name]};local _,runs,index=A:fni(seq,store.tick_ts-s.ts,s.loop,s.fps,store.tick_length);s.runs=runs;s.frame_idx=index end end
 end
 rows[#rows+1]={birth=birth,scenario=scenario,initialLevel=initialLevel,frames=frames,events=events,calls=calls}
end end
U.find_foremost_enemy,P.predict_enemy_pos,S.queue,simulation=old.find,old.predict,old.sound,old.sim
local f=assert(io.open('analysis/catapult-explosive-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' native catapult explosive coroutine cases,20800 frames')
