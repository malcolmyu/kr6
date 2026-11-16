TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,U,GR,J=require('entity_db'),require('script_utils'),require('utils'),require('grid_db'),require('dkjson')
require('sound_db').queue=function()end;GR.cell_is=function()return false end
local gui=assert(loadfile('analysis/function-bytecode/game_gui_line5113.lua'));local vector=require('klua.vector');debug.setupvalue(gui,1,vector)
local rows={}
for _,birth in ipairs({0,100,3151})do for _,distance in ipairs({0,20,100})do for _,interrupt in ipairs({false,true})do
 local h=E:create_entity('hero_gerald');local store={tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={[h.id]=h}};h.pos={x=500,y=350};assert(h.main_script.insert(h,store));h.nav_rally.new=false;h.nav_rally.pos=table.clone(h.pos);h.nav_rally.center=table.clone(h.pos);h.nav_grid.waypoints={};h.health.immune_to=17;h.render.sprites[1].ts=store.tick_ts
 local frames={};local co=coroutine.create(function()while true do while h.nav_rally.new do if SU.y_hero_new_rally(store,h)then break end end;coroutine.yield()end end)
 for relative=1,90 do
  local command=relative==1 and{x=500+distance,y=350}or interrupt and relative==4 and{x=470,y=380}
  if command then gui(h,command.x,command.y,0,nil)end
  store.tick_ts=(birth+relative)*TICK_LENGTH;local ok,err=coroutine.resume(co);assert(ok,debug.traceback(co,tostring(err)))
  frames[#frames+1]={tick=birth+relative,pos=table.clone(h.pos),bans=h.vis.bans,immune=h.health.immune_to,command=command}
 end
 rows[#rows+1]={birth=birth,distance=distance,interrupt=interrupt,frames=frames}
end end end
local f=assert(io.open('analysis/gerald-rally-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original ordinary hero rally protection/movement/retarget traces')
