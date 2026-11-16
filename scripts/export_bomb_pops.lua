EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,G,U,S=require('entity_db'),require('dkjson'),require('grid_db'),require('upgrades'),require('sound_db')
G.cell_type=function()return TERRAIN_LAND end;U.get_upgrade=function()end;S.queue=function()end;require('path_db').is_node_valid=function()return true end
local rows={}
for rank=1,4 do for _,count in ipairs({0,1,3})do for _,roll in ipairs({.199999,.2,.8})do
 local calls,events,store=0,{},{tick_ts=0,tick_length=1/30,entities={},damage_queue={}}
 math.random=function(a,b)calls=calls+1;if a then return a+math.floor(roll*(b-a+1))end;return roll end
 simulation={queue_insert_entity=function(_,e)if e and e.pop_y_offset then events[#events+1]={at=store.tick_ts,pos=table.deepclone(e.pos),rotation=e.render.sprites[1].r,frame=e.render.sprites[1].name}end end,queue_remove_entity=function()end}
 for i=1,count do local e=E:create_entity('enemy_bandit');e.pos={x=500+i,y=350};e.health.hp=1000;store.entities[e.id]=e end
 local b=E:create_entity('bullet_catapult_lvl'..rank);b.pos={x=400,y=400};b.bullet.from=table.deepclone(b.pos);b.bullet.to={x=500,y=350};b.bullet.particles_name=nil;assert(b.main_script.insert(b,store));local co=coroutine.create(b.main_script.update);local frames={}
 for tick=0,40 do store.tick_ts=tick*(1/30);if coroutine.status(co)~='dead'then assert(coroutine.resume(co,b,store))end;frames[#frames+1]={at=store.tick_ts,calls=calls};end
 rows[#rows+1]={rank=rank,count=count,roll=roll,frames=frames,pops=events}
end end end
local f=assert(io.open('analysis/bomb-pops-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original bomb landing-pop cases exported')
