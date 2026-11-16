EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local U=require('utils');local J=require('dkjson');local GR=require('grid_db');local UP=require('upgrades')
GR.cell_type=function()return TERRAIN_LAND end;require('sound_db').queue=function()end;UP.get_upgrade=function()return nil end
require('path_db').is_node_valid=function()return true end
local inserted={};simulation={queue_insert_entity=function(_,e)if e then inserted[#inserted+1]={name=e.template_name,pos=table.deepclone(e.pos)}end end,queue_remove_entity=function()end}
local out={flights={},damage={}}
local oldRandom=math.random;math.random=function()return .5 end
for _,to in ipairs({{x=620,y=350},{x=350,y=390},{x=720,y=310}})do
 local e=E:create_entity('bullet_catapult_lvl1');e.pos={x=500,y=400};e.bullet.from=table.deepclone(e.pos);e.bullet.to=to;e.bullet.particles_name=nil;e.bullet.pop=nil
 local store={tick_length=1/30,tick_ts=0,entities={},damage_queue={}};inserted={}
 assert(e.main_script.insert(e,store));local co=coroutine.create(e.main_script.update)
 local row={to=to,from=table.deepclone(e.pos),speed=table.deepclone(e.bullet.speed),frames={}}
 for frame=0,60 do store.tick_ts=frame/30;local ok,err=coroutine.resume(co,e,store);assert(ok,err);row.frames[#row.frames+1]={pos=table.deepclone(e.pos),r=e.render.sprites[1].r,hidden=e.render.sprites[1].hidden or false,done=coroutine.status(co)=='dead'};if coroutine.status(co)=='dead' then break end end
 row.effects=inserted;out.flights[#out.flights+1]=row
end
for _,name in ipairs({'bullet_catapult_lvl1','bullet_catapult_lvl2','bullet_catapult_lvl3','bullet_catapult_lvl4'})do
 local store={tick_length=1/30,tick_ts=0,entities={},damage_queue={}};local targets={}
 for _,offset in ipairs({{0,0},{30,0},{0,21},{30,21},{59,0},{0,41.3},{60,0},{0,42},{60.01,0},{0,42.01},{-40,-10}})do
  local e=E:create_entity('enemy_bandit');e.pos={x=500+offset[1],y=350+offset[2]};e.health.hp=100;e.health.hp_max=100;store.entities[e.id]=e;targets[e.id]=offset
 end
 local crow=E:create_entity('enemy_crow');crow.pos={x=500,y=350};crow.health.hp=100;crow.health.hp_max=100;store.entities[crow.id]=crow;targets[crow.id]={0,0}
 local b=E:create_entity(name);b.pos={x=400,y=400};b.bullet.from=table.deepclone(b.pos);b.bullet.to={x=500,y=350};b.bullet.particles_name=nil;b.bullet.pop=nil
 assert(b.main_script.insert(b,store));local co=coroutine.create(b.main_script.update)
 for frame=0,40 do store.tick_ts=frame/30;assert(coroutine.resume(co,b,store));if coroutine.status(co)=='dead'then break end end
 local row={name=name,hits={},factors={}}
 for _,d in ipairs(store.damage_queue)do row.hits[#row.hits+1]={name=store.entities[d.target_id].template_name,offset=targets[d.target_id],value=d.value,type=d.damage_type}end
 for id,offset in pairs(targets)do row.factors[#row.factors+1]={name=store.entities[id].template_name,offset=offset,value=U.dist_factor_inside_ellipse({x=500+offset[1],y=350+offset[2]},b.bullet.to,b.bullet.damage_radius)}end
 out.damage[#out.damage+1]=row
end
math.random=oldRandom
local f=assert(io.open('analysis/catapult-oracle.json','w'));f:write(J.encode(out));f:close()
