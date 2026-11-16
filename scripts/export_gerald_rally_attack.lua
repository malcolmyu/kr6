TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,G,J=require('entity_db'),require('script_utils'),require('grid_db'),require('dkjson');require('sound_db').queue=function()end;G.cell_is=function()return false end
local gui=assert(loadfile('analysis/function-bytecode/game_gui_line5113.lua'));debug.setupvalue(gui,1,require('klua.vector'));local rows={}
for _,epoch in ipairs({0,8400})do for origin=0,29 do
 local birth=epoch+origin;local h=E:create_entity('hero_gerald');local start={x=500,y=350};h.pos=table.clone(start);local store={tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={},damage_queue={}}
 assert(h.main_script.insert(h,store));h.nav_rally.new=false;h.nav_rally.pos=table.clone(start);h.nav_rally.center=table.clone(start);h.nav_grid.waypoints={};h.health.immune_to=17
 local e=E:create_entity('enemy_bandit');e.pos={x=540,y=350};e.health.hp=10000;store.entities[h.id]=h;store.entities[e.id]=e;e.enemy.blockers={h.id};h.soldier.target_id=e.id
 math.random=function(a,b)return a and a+math.floor(.25*(b-a+1))or .25 end
 simulation={queue_insert_entity=function()end,queue_remove_entity=function()end}
 local attack=h.melee.attacks[2];local co=coroutine.create(function()
  SU.y_soldier_do_single_melee_attack(store,h,e,attack)
  coroutine.yield()
  while h.nav_rally.new do SU.y_hero_new_rally(store,h)end
 end);local frames={}
 for relative=1,60 do
  local command=relative==22 and{x=520,y=350}or nil;if command then gui(h,command.x,command.y,0,nil)end
  store.tick_ts=(birth+relative)*TICK_LENGTH
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co);assert(ok,debug.traceback(co,tostring(err)))end
  frames[#frames+1]={tick=birth+relative,pos=table.clone(h.pos),bans=h.vis.bans,immune=h.health.immune_to,command=command}
 end
 rows[#rows+1]={birth=birth,frames=frames}
end end
local f=assert(io.open('analysis/gerald-rally-attack-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original post-hit attack → rally continuation traces across30 tick residues/two epochs')
