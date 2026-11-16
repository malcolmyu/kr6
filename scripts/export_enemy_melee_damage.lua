EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local SU=require('script_utils');local J=require('dkjson');local oldRandom=math.random;local rows={}
for _,roll in ipairs({0,.01,.1,.24,.25,.49,.5,.74,.75,.99})do for _,factor in ipairs({.73,1,1.5})do
 math.random=function(a,b)return a and a+math.floor(roll*(b-a+1))or .5 end
 local e=E:create_entity('enemy_bandit');local h=E:create_entity('soldier_knights_lvl1');h.dodge=nil;e.pos={x=500,y=350};h.pos={x=530,y=350};e.melee.order={1};e.unit.damage_factor=factor
 local attack=e.melee.attacks[1];attack.ts=-10;attack.damage_min=3;attack.damage_max=7;attack.hit_damage_factor={.5,.9};e.enemy.blockers={h.id}
 local store={tick_ts=0,tick_length=1/30,entities={[e.id]=e,[h.id]=h},damage_queue={}};local co=coroutine.create(SU.y_enemy_melee_attacks)
 for frame=0,15 do store.tick_ts=frame/30;local ok,err=coroutine.resume(co,store,e,h);assert(ok,debug.traceback(co,tostring(err)))end
 local damage={};for _,d in ipairs(store.damage_queue)do damage[#damage+1]=d.value end
 rows[#rows+1]={random=roll,factor=factor,min=3,max=7,hitFactors=attack.hit_damage_factor,damage=damage}
end end
math.random=oldRandom
local f=assert(io.open('analysis/enemy-melee-damage-oracle.json','w'));f:write(J.encode(rows));f:close();print('Native integer enemy melee damage exported')
