EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local P=require('path_db');P.is_node_valid=function()return true end
local rows={};local random=math.random;math.random=function()return .5 end
for level=1,4 do
 local prototype=E:get_template('tower_archers_lvl'..level)
 for shooterId,sid in ipairs(prototype.shooters_sids)do for _,offset in ipairs({{100,50},{-100,50},{100,-50},{-100,-50},{0,-40},{0,-30}})do
  local tower=E:create_entity('tower_archers_lvl'..level);tower.pos={x=500,y=350}
  local target=E:create_entity('enemy_bandit');target.pos={x=500+offset[1],y=350+offset[2]};target.motion.speed={x=0,y=0};target.motion.forced_waypoint={};target.health.hp=1000;target.nav_path.pi=1;target.nav_path.ni=10
  local c=E:create_entity('controller_archers_shooter');c.tower_ref=tower;c.shooter_sid=sid;c.shooter_id=shooterId;c.bow_sid=tower.bows_sids and tower.bows_sids[shooterId];c.long_idle_pos={x=0,y=0};c.shoot=true;c.attack=tower.attacks.list[1];c.trigger_enemy=target;c.pred_pos=table.deepclone(target.pos)
  tower.attacks._last_target_pos={}
  local store={tick_ts=0,tick_length=1/30,entities={[target.id]=target,[tower.id]=tower}};local shots={}
  simulation={queue_insert_entity=function(_,b)shots[#shots+1]={at=store.tick_ts,from=table.deepclone(b.bullet.from),to=table.deepclone(b.bullet.to),predict=b.bullet.predict_target_pos}end}
  local co=coroutine.create(c.main_script.update);local initial
  for frame=0,40 do store.tick_ts=frame/30;for _,s in ipairs(tower.render.sprites)do if not s.loop and store.tick_ts-s.ts>=28/30 then s.runs=1 end end;assert(coroutine.resume(co,c,store));if frame==0 then initial={name=tower.render.sprites[sid].name,flip=tower.render.sprites[sid].flip_x,bowHidden=c.bow_sid and tower.render.sprites[c.bow_sid].hidden}end end
  assert(#shots==1,#shots);rows[#rows+1]={level=level,shooterId=shooterId,sid=sid,offset=offset,initial=initial,shot=shots[1]}
 end end
end
math.random=random
local f=assert(io.open('analysis/archers-shooter-oracle.json','w'));f:write(J.encode(rows));f:close()
