EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local P=require('path_db');P.is_node_valid=function()return true end
local random=math.random;math.random=function()return .5 end
local rows={}
for level=1,4 do
 local tower=E:create_entity('tower_archers_lvl'..level);tower.pos={x=500,y=350}
 local target=E:create_entity('enemy_bandit');target.pos={x=600,y=400};target.motion.speed={x=0,y=0};target.motion.forced_waypoint={};target.health.hp=1000;target.nav_path.pi=1;target.nav_path.ni=10
 local store={tick_ts=0,tick_length=1/30,wave_group_number=1,entities={[tower.id]=tower,[target.id]=target}}
 local children,shots={},{}
 simulation={queue_insert_entity=function(_,e)if e.template_name=='controller_archers_shooter' then children[#children+1]={entity=e,co=coroutine.create(e.main_script.update),inserted=store.tick_ts};store.entities[e.id]=e elseif e.bullet then shots[#shots+1]={at=store.tick_ts,from=table.deepclone(e.bullet.from),to=table.deepclone(e.bullet.to)}end end,queue_remove_entity=function()end}
 local co=coroutine.create(tower.main_script.update)
 for frame=0,180 do
  store.tick_ts=frame/30
  for _,s in ipairs(tower.render.sprites)do if s.name=='shoot' or s.name=='shootback' then s.runs=math.floor((store.tick_ts-s.ts)/(28/30)+1e-9)end end
  assert(coroutine.resume(co,tower,store))
  for _,child in ipairs(children)do if store.tick_ts>child.inserted then assert(coroutine.resume(child.co,child.entity,store))end end
 end
 rows[#rows+1]={level=level,shots=shots,controllerPhase='inserted controllers begin on next tick'}
end
math.random=random
local f=assert(io.open('analysis/archers-cycle-oracle.json','w'));f:write(J.encode(rows));f:close()
