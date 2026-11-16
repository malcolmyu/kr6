TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,G,S,J=require('entity_db'),require('grid_db'),require('sound_db'),require('dkjson');local rows={};local create=E.create_entity
for level=1,4 do for _,kind in ipairs({'normal','dodge','miss-active','dead','removed'})do for _,cell in ipairs({TERRAIN_LAND,TERRAIN_WATER,TERRAIN_ICE})do for _,roll in ipairs({.2,.8})do
 local e=E:create_entity('enemy_bandit');e.pos={x=600,y=350};e.health.hp=1000;e.health.dead=kind=='dead';e.unit.hit_offset={x=0,y=0}
 E:add_comps(e,'dodge');e.dodge.ranged=true;e.dodge.chance=kind=='dodge'and 1 or 0;e.dodge.active=kind=='miss-active';e.dodge.show_pop=true;e.dodge.silent=true;e.dodge.pop='pop_miss'
 local shot=E:create_entity('bullet_archers_lvl'..level);shot.pos={x=600,y=kind=='miss-active'and 450 or 350};local b=shot.bullet;b.from={x=500,y=350};b.to=table.clone(shot.pos);b.ts=0;b.flight_time=0;b.target_id=e.id
 local store={tick_ts=1,tick_length=TICK_LENGTH,entities=kind=='removed'and{}or{[e.id]=e}};local events,calls={},0
 store.damage_queue={};E.create_entity=function(self,name,...)local m=create(self,name,...);if name=='damage'then events[#events+1]={name=name}end;return m end
 G.cell_is=function(_,x,y,flag)return bit.band(cell,flag)~=0 end
 math.random=function(a,b)calls=calls+1;return a and a+math.floor(roll*(b-a+1))or roll end
 simulation={queue_insert_entity=function(_,m)events[#events+1]={name=m.template_name}end,queue_remove_entity=function()end,queue_damage=function()events[#events+1]={name='damage'}end}
 S.queue=function(_,name)if name then events[#events+1]={sound=name}end end
 local co=coroutine.create(shot.main_script.update);local ok,err=coroutine.resume(co,shot,store);assert(ok,debug.traceback(co,tostring(err)))
 rows[#rows+1]={level=level,kind=kind,cell=cell,roll=roll,events=events,calls=calls}
end end end end
local f=assert(io.open('analysis/archers-arrow-impact-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original archer arrow impact effect/pop allocation and sound traces')
