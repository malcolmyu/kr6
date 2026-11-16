TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local E,SU,P,G,J=require('entity_db'),require('script_utils'),require('path_db'),require('grid_db'),require('dkjson');require('sound_db').queue=function()end
math.random=function(a,b)return a and(a+math.floor(.25*((b or a)-(b and a or 1)+1)))or .25 end
local rows={}
for stage=1,3 do
 G:load(string.format('level%02d',stage));P:load(string.format('level%02d',stage),{left=-512/3,right=1024+512/3,bottom=0,top=768})
 local data=J.decode(assert(io.open(string.format('public/data/level%02d.json',stage))):read('*a'))
 for pi=1,#P.paths do for spi=1,#P.paths[pi]do for _,name in ipairs({'enemy_bandit','enemy_blackguard','enemy_shadow_archer','enemy_shadow_blades','enemy_crow'})do
  local e=E:create_entity(name);e.nav_path.pi=pi;e.nav_path.spi=spi;e.nav_path.ni=P:get_start_node(pi);e.pos=P:node_pos(e.nav_path);local store={tick_ts=0,tick_length=TICK_LENGTH,level_difficulty=2,entities={[e.id]=e}}
  assert(e.main_script.insert(e,store));local initial={pos=table.clone(e.pos),pi=e.nav_path.pi,spi=e.nav_path.spi,ni=e.nav_path.ni,speed=e.motion.max_speed}
  local co=coroutine.create(function()while true do SU.y_enemy_walk_step(store,e)end end);local frames={}
  for tick=1,1200 do
   store.tick_ts=tick*TICK_LENGTH;local ok,err=coroutine.resume(co);assert(ok,debug.traceback(co,tostring(err)));local s=e.render.sprites[1]
   frames[#frames+1]={pos=table.clone(e.pos),pi=e.nav_path.pi,ni=e.nav_path.ni,name=s.name,flip=s.flip_x,at=s.ts,quadrant=s._last_quadrant}
   if e.nav_path.ni>=data.navigation.ends[e.nav_path.pi]and not data.navigation.connections[e.nav_path.pi]then break end
  end
  rows[#rows+1]={stage=stage,pi=pi,spi=spi,name=name,initial=initial,frames=frames}
 end end end
end
local f=assert(io.open('analysis/enemy-walk-facing-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original path walk/facing traces, all first-three-stage paths/lanes and five enemy families')
