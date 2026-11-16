EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,J=require('entity_db'),require('script_utils'),require('dkjson');local originalRandom=math.random;local rows={}
local sound=require('sound_db');local oldQueue=sound.queue;sound.queue=function()end
local oldSimulation=simulation;simulation={queue_insert_entity=function()end}
for _,bounds in ipairs({{4,12},{4.4,13.2},{4.2,12.6}})do for _,factor in ipairs({.73,1,1.3,2,2.6})do for _,seed in ipairs({1,7,19,101})do
 local h=E:create_entity('hero_zefira');h.main_script.insert(h,{tick_ts=0});h.pos={x=500,y=350};h.unit.damage_factor=factor
 local e=E:create_entity('enemy_bandit');e.pos={x=530,y=350};e.enemy.blockers={h.id};h.soldier.target_id=e.id;e.dodge=nil
 local a=h.melee.attacks[1];a.damage_min=bounds[1];a.damage_max=bounds[2];local calls={}
 math.randomseed(seed);math.random=function(lo,hi)local value=originalRandom(lo,hi);calls[#calls+1]={lo=lo,hi=hi,value=value};return value end
 local store={tick_ts=0,tick_length=1/30,entities={[h.id]=h,[e.id]=e},damage_queue={}}
 local co=coroutine.create(SU.y_soldier_do_single_melee_attack)
 for frame=0,20 do store.tick_ts=frame/30;local sprite=h.render.sprites[1];sprite.runs=math.floor((store.tick_ts-sprite.ts)/(34/30));if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,store,h,e,a);assert(ok,debug.traceback(co,tostring(err)))end end
 math.random=originalRandom;math.randomseed(seed);for _,c in ipairs(calls)do c.uniform=math.random()end
 assert(#store.damage_queue==1);assert(#calls==1,'fixture must isolate the damage roll')
 rows[#rows+1]={min=bounds[1],max=bounds[2],factor=factor,random=calls[1].uniform,roll=calls[1].value,value=store.damage_queue[1].value}
end end end
math.random=originalRandom;sound.queue=oldQueue;simulation=oldSimulation
local f=assert(io.open('analysis/soldier-melee-damage-oracle.json','w'));f:write(J.encode(rows));f:close();print('60 seeded native soldier melee rolls, including fractional passive bounds, exported')
