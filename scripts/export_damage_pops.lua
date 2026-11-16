EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local S=require('systems');local J=require('dkjson');local oldRandom=math.random;local rows={}
for _,kind in ipairs({'melee-crit','ranged-crit','zap','melee-normal'})do for _,roll in ipairs({.05,.1,.8})do for _,result in ipairs({0,2})do
 local hero=E:create_entity('hero_zefira');hero.pos={x=500,y=350};local enemy=E:create_entity('enemy_blackguard');enemy.pos={x=530,y=360};local bullet=E:create_entity('bullet_zefira')
 local source=kind=='melee-crit'and hero or kind=='melee-normal'and enemy or bullet;local target=kind=='melee-normal'and hero or enemy
 local names=kind=='melee-crit'and{'pop_crit_heroes'}or kind=='ranged-crit'and{'pop_crit'}or kind=='zap'and{'pop_zap_blue'}or{'pop_sok','pop_pow'}
 local chance=kind=='melee-crit'and 1 or kind=='melee-normal'and .1 or nil;local conds=(kind=='ranged-crit'or kind=='zap')and 2 or nil
 local store={tick_ts=3,entities={[hero.id]=hero,[enemy.id]=enemy,[bullet.id]=bullet},damage_queue={{source_id=source.id,target_id=target.id,pop=names,pop_chance=chance,pop_conds=conds,damage_result=result}}};local events,calls={},{}
 math.random=function(a,b)local value=a and a+math.floor(roll*(b-a+1))or roll;calls[#calls+1]={a=a,b=b,result=value};return value end
 simulation={queue_insert_entity=function(_,o)events[#events+1]={name=o.template_name,pos=o.pos,rotation=o.render.sprites[1].r,frame=o.render.sprites[1].name}end}
 S.pops:on_update(1/30,3,store);rows[#rows+1]={kind=kind,roll=roll,result=result,names=names,chance=chance,conds=conds,events=events,calls=calls}
end end end
math.random=oldRandom
local f=assert(io.open('analysis/damage-pops-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original damage-result pop selection, placement and random consumption exported')
