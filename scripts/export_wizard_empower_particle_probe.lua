local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub("if entity.template_name~='ps_bullet_zefira'and entity.template_name~='ps_power_rain_of_fire'then return nil end", "if not entity.particle_system then return nil end",1)
source=source:gsub('hp=entity.health and entity.health.hp,','heroRanged=entity.hero and table.deepclone(entity.ranged),hp=entity.health and entity.health.hp,',1)
source=source:gsub('local function snapshotRuntime%(%)', 'local function snapshotRuntime() if store.tick<(tonumber(arg[12])or 15828)then return end',1)
source=source:gsub("local U=require%('utils'%);local find=U.find_foremost_enemy",[[local U=require('utils');local walk=U.walk
 U.walk=function(e,dt,...)
  local record
  if e.template_name=='hero_zefira'and currentStore.tick>=(tonumber(arg[12])or 15828) and currentStore.tick<=15833 then local dx=e.motion.dest.x-e.pos.x;local dy=e.motion.dest.y-e.pos.y;local a=math.atan2(dy,dx);record={tick=currentStore.tick,before=table.clone(e.pos),dest=table.clone(e.motion.dest),angle=a,cos=math.cos(a),sin=math.sin(a),distance=math.sqrt(dx*dx+dy*dy),step=e.motion.max_speed*dt}end
  local r=walk(e,dt,...)
  if record then record.after=table.clone(e.pos);record.result=r;print(dofile('scripts/precise_json.lua')(record))end
  return r
 end
 local find=U.find_foremost_enemy]],1)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
