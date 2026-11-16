EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,GR,P,S,U,UP=require('entity_db'),require('dkjson'),require('grid_db'),require('path_db'),require('sound_db'),require('utils'),require('upgrades')
local rows={};math.random=function()return .5 end;P.is_node_valid=function()return true end
GR.cell_type=function()return TERRAIN_LAND end;S.queue=function()end
simulation={queue_insert_entity=function()end,queue_remove_entity=function()end}
local apply
for i=1,20 do local name,fn=debug.getupvalue(UP.patch_templates,i);if name=='patch_upgrades'then apply=fn end end
assert(apply)
for i=1,20 do local name,fn=debug.getupvalue(apply,i);if name=='T'then assert(fn('bullet_catapult_lvl1')==E:get_template('bullet_catapult_lvl1'),'native patch lookup differs from current entity db')end end
for _,upgraded in ipairs({false,true})do
 if upgraded then UP.max_level=10;UP.levels={artillery={'l1','l2','l3b'}};apply(UP,{})end
 for rank=1,4 do for _,factor in ipairs({1,1.75})do for _,name in ipairs({'enemy_bandit','enemy_blackguard','enemy_shadow_blades'})do
  local store,targets={tick_ts=0,tick_length=1/30,entities={},damage_queue={}},{ }
  for i,offset in ipairs({0,20,50})do
   local e=E:create_entity(name);e.pos={x=500+offset,y=350};e.health.hp=1000;e.webKey=i;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;store.entities[e.id]=e
   targets[i]={offset=offset,health=table.deepclone(e.health)}
  end
  local b=E:create_entity('bullet_catapult_lvl'..rank);b.pos={x=400,y=400};b.bullet.from=table.deepclone(b.pos);b.bullet.to={x=500,y=350};b.bullet.damage_factor=factor;b.bullet.particles_name=nil;b.bullet.pop=nil
  assert(b.main_script.insert(b,store));local co=coroutine.create(b.main_script.update)
  for tick=0,100 do store.tick_ts=tick*(1/30);local ok,err=coroutine.resume(co,b,store);assert(ok,err);if coroutine.status(co)=='dead'then break end end
  assert(coroutine.status(co)=='dead');local damage={}
  for _,d in ipairs(store.damage_queue)do local e=store.entities[d.target_id];damage[#damage+1]={target=e.webKey,value=d.value,explosive_factor=d.explosive_factor,applied=U.predict_damage(e,d)}end
  table.sort(damage,function(a,b)return a.target<b.target end)
  rows[#rows+1]={bullet={min=b.bullet.damage_min,max=b.bullet.damage_max,radius=b.bullet.damage_radius},upgraded=upgraded,rank=rank,factor=factor,name=name,targets=targets,damage=damage,impactAt=store.tick_ts}
 end end end
end
local f=assert(io.open(GLOBAL_IMPACT_OUTPUT or'analysis/global-artillery-impact-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original artillery projectile impacts with queued explosive_factor and native post-armour damage exported')
