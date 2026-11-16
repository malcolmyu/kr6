EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,GR,P,S=require('entity_db'),require('dkjson'),require('grid_db'),require('path_db'),require('sound_db')
local previous={sim=simulation,cell=GR.cell_type,node=P.is_node_valid,sound=S.queue,random=math.random};local rows={};math.random=function()return .5 end;P.is_node_valid=function()return true end
for level=1,3 do for _,factor in ipairs({1,1.75})do for _,water in ipairs({false,true})do
 local store={tick_ts=0,tick_length=1/30,entities={},damage_queue={}};local effects,sounds={},{}
 GR.cell_type=function()return water and TERRAIN_WATER or TERRAIN_LAND end
 simulation={queue_insert_entity=function(_,e)if e then effects[#effects+1]={name=e.template_name,level=e.aura and e.aura.level,pos=table.deepclone(e.pos)}end end,queue_remove_entity=function()end}
 S.queue=function(_,name)sounds[#sounds+1]=name end
 local targets={}
 for i,d in ipairs({{0,0},{30,0},{62.4,0},{62.40001,0},{0,43.68},{40,20},{0,0,air=true},{0,0,immune=true}})do
  local e=E:create_entity('enemy_bandit');e.pos={x=500+d[1],y=350+d[2]};e.health.hp=1000;e.webKey=i;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
  if d.air then e.vis.flags=bit.bor(e.vis.flags,128)end;if d.immune then e.vis.bans=bit.bor(e.vis.bans,8)end
  targets[i]={id=i,offset={x=d[1],y=d[2]},flags=e.vis.flags,bans=e.vis.bans};store.entities[e.id]=e
 end
 local b=E:create_entity('bullet_catapult_skill_c');b.pos={x=400,y=400};b.bullet.from=table.deepclone(b.pos);b.bullet.to={x=500,y=350};b.bullet.level=level;b.bullet.damage_factor=factor;b.bullet.particles_name=nil;b.bullet.pop=nil
 assert(b.main_script.insert(b,store));local co=coroutine.create(b.main_script.update)
 for tick=0,40 do store.tick_ts=tick*(1/30);local ok,err=coroutine.resume(co,b,store);assert(ok,err);if coroutine.status(co)=='dead'then break end end
 assert(coroutine.status(co)=='dead','native trap projectile must finish');local damage={}
 for _,d in ipairs(store.damage_queue)do damage[#damage+1]={target=store.entities[d.target_id].webKey,value=d.value,type=d.damage_type}end
 table.sort(damage,function(a,b)return a.target<b.target end)
 rows[#rows+1]={level=level,factor=factor,water=water,targets=targets,damage=damage,effects=effects,sounds=sounds,impactAt=store.tick_ts}
end end end
simulation,GR.cell_type,P.is_node_valid,S.queue,math.random=previous.sim,previous.cell,previous.node,previous.sound,previous.random
local f=assert(io.open('analysis/catapult-trap-impact-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' native trap projectile land/water impacts, original radial damage and payload rank exported')
