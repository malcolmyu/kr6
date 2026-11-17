TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU=require('entity_db'),require('script_utils');local rows={};local originalDamage=SU.create_bullet_damage
for level=1,3 do for _,birth in ipairs({0,1795})do for _,factor in ipairs({1,1.75})do for _,kind in ipairs({'normal','dead','missing','removed-later','moving','banned','flipped','source-sold'})do
 local tower=E:create_entity('tower_archers_lvl4');tower.pos={x=500,y=350}
 local enemy=E:create_entity('enemy_bandit');enemy.pos={x=620,y=380};enemy.health.hp=1000;enemy.unit.hit_offset={x=3,y=13};enemy.render.sprites[1].flip_x=kind=='flipped'
 local ray=E:create_entity('bullet_archers_skill_a_lvl'..level);ray.pos={x=516,y=415};ray.bullet.from=table.clone(ray.pos);ray.bullet.to={x=623,y=393};ray.bullet.source_id=tower.id;ray.bullet.target_id=enemy.id;ray.bullet.damage_factor=factor;ray.bullet.damage_min=tower.powers.skill_a.damage_min[level];ray.bullet.damage_max=tower.powers.skill_a.damage_max[level]
 local store={tick=birth,tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={[tower.id]=tower,[enemy.id]=enemy},damage_queue={}};local events={};local draws=0
 math.random=function()draws=draws+1;return .25 end
 SU.create_bullet_damage=function(...)local d=originalDamage(...);events[#events+1]={tick=store.tick,damage=d.value,type=d.damage_type,track=d.track_kills};return d end
 simulation={queue_insert_entity=function(_,m)events[#events+1]={tick=store.tick,name=m.template_name,pos=table.clone(m.pos),level=m.modifier and m.modifier.level,target=m.modifier and(m.modifier.target_id==enemy.id),source=m.modifier and m.modifier.source_id}end,queue_remove_entity=function(_,m)m.removed=true end}
 local co=coroutine.create(ray.main_script.update);local frames={}
 for tick=1,35 do
  store.tick=birth+tick;store.tick_ts=store.tick*TICK_LENGTH
  if kind=='dead'then enemy.health.dead=true end
  if kind=='missing'or kind=='removed-later'and tick>=2 then store.entities[enemy.id]=nil end
  if kind=='moving'then enemy.pos.x=620+tick*2 end
  if kind=='banned'then enemy.vis.bans=2 end
  if kind=='source-sold'and tick>=2 then store.entities[tower.id]=nil end
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,ray,store);assert(ok,debug.traceback(co,tostring(err)))end
  local s=ray.render.sprites[1];frames[#frames+1]={tick=store.tick,ts=s.ts,rotation=s.r,scale=table.clone(s.scale),hidden=not not s.hidden,removed=not not ray.removed,draws=draws}
 end
 rows[#rows+1]={level=level,birth=birth,factor=factor,kind=kind,frames=frames,events=events}
end end end end
SU.create_bullet_damage=originalDamage
local f=assert(io.open('analysis/archers-pierce-ray-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original A ray main traces')
