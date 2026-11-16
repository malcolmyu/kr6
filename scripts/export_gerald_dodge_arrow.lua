EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local GR=require('grid_db');local J=require('dkjson');local oldCell=GR.cell_is;GR.cell_is=function(_,x,y,terrain)return terrain==TERRAIN_LAND end;local oldRandom=math.random;local rows={}
for _,chance in ipairs({0,.35})do for _,roll in ipairs({.1,.35,.8})do
 local h=E:create_entity('hero_gerald');h.main_script.insert(h,{tick_ts=0});h.pos={x=120,y=0};h.dodge.chance=chance
 local b=E:create_entity('bullet_shadow_archer');b.pos={x=0,y=0};b.bullet.from={x=0,y=0};b.bullet.to={x=120,y=12};b.bullet.target_id=h.id
 local store={tick_ts=0,tick_length=1/30,entities={[h.id]=h},damage_queue={}};local effects,randoms={},{};math.random=function(a,z)local value=a and a+math.floor(roll*(z-a+1))or roll;randoms[#randoms+1]={at=store.tick_ts,a=a,b=z,result=value};return value end
 simulation={queue_insert_entity=function(_,o)effects[#effects+1]={at=store.tick_ts,name=o.template_name,pos=table.deepclone(o.pos),rotation=o.render and o.render.sprites[1]and o.render.sprites[1].r}end,queue_remove_entity=function()end}
 assert(b.main_script.insert(b,store));local co=coroutine.create(b.main_script.update);local frames={}
 for frame=0,60 do store.tick_ts=frame/30;if coroutine.status(co)~='dead'then local ok,e=coroutine.resume(co,b,store);assert(ok,debug.traceback(co,tostring(e)))end;local damage={};for _,d in ipairs(store.damage_queue)do damage[#damage+1]=d.value end;frames[#frames+1]={at=store.tick_ts,active=h.dodge.active,damage=damage,done=coroutine.status(co)=='dead'}end
 rows[#rows+1]={chance=chance,roll=roll,frames=frames,effects=effects,randoms=randoms}
end end
math.random=oldRandom;GR.cell_is=oldCell
local f=assert(io.open('analysis/gerald-dodge-arrow-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original KR6 shadow arrow dodge traces exported')
