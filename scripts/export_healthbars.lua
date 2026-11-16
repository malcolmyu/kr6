EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/systems.lua 2776 2785 2912')==0)
local E=require('entity_db');local V=require('klua.vector');local GS=require('game_settings');local J=require('dkjson')
local km;for i=1,20 do local n,v=debug.getupvalue(require('script_utils').hero_level_up,i);if n=='km' then km=v end end
local bindings={E=E,V=V,GS=GS,km=km,U={},SH={},A={},EXO={},I={},prs={}}
local function load(line)
 local f=assert(loadfile('analysis/function-bytecode/systems_line'..line..'.lua'))
 for i=1,20 do local n=debug.getupvalue(f,i);if not n then break end;assert(bindings[n],n);debug.setupvalue(f,i,bindings[n])end
 return f
end
local init,insert,update=load(2776),load(2785),load(2912)
local f=assert(io.open('public/data/health-bars.json','w'));f:write(J.encode({sizes=HEALTH_BAR_SIZES.default,colors=GS.health_bar_colors or HEALTH_BAR_COLORS}));f:close()
local rows={}
for _,name in ipairs({'enemy_bandit','enemy_crow','soldier_knights_lvl1','hero_gerald'})do for _,scenario in ipairs({'damage-heal','reverse-fade','hidden'})do
 local e=E:create_entity(name);e.render={sprites={},frames={}};e.health.hp_max=100;e.health.hp=100;e.pos=V.v(100.75,200.25)
 local store={entities={[e.id]=e}};local self={};init(self,store);insert(self,e,store)
 local row={id=e.id,name=name,scenario=scenario,frames={}}
 for frame=0,45 do
  if frame==3 then e.health.hp=50 end
  if scenario=='reverse-fade' and frame==5 or scenario~='reverse-fade' and frame==20 then e.health.hp=100 end
  if scenario=='hidden' and frame==10 then e.health_bar.hidden=true end
  if frame==30 then e.health.hp=10 end
  update(self,1/30,frame/30,store)
  local fb,ff=e.health_bar.frames[1],e.health_bar.frames[2]
  row.frames[#row.frames+1]={frame=frame,hp=e.health.hp,hidden=e.health_bar.hidden,alpha=e.health_bar.alpha,fadeAt=e.health_bar.fade_ts,bg={z=fb.z,draw_order=fb.draw_order,sort_y_offset=fb.sort_y_offset,pos=fb.pos,offset=fb.offset,scale=fb.scale,alpha=fb.alpha,hidden=fb.hidden},fg={z=ff.z,draw_order=ff.draw_order,sort_y_offset=ff.sort_y_offset,pos=ff.pos,offset=ff.offset,scale=ff.scale,alpha=ff.alpha,hidden=ff.hidden}}
  -- Native render frames mutate in place; freeze each recorded sample.
  row.frames[#row.frames]=J.decode(J.encode(row.frames[#row.frames]))
 end
 rows[#rows+1]=row
end end
f=assert(io.open('analysis/health-bars-oracle.json','w'));f:write(J.encode(rows));f:close()

-- Feed controlled frames to the shipped render update's own final insertion sort.
-- No replacement comparator is used to produce the expected ordering.
local cases={
 {name='bar-behind-front-body',frames={{key='back-body',z=3000,pos={x=100.75,y=200.25},draw_order=100090},{key='back-bar-bg',z=3000,pos={x=100,y=201},draw_order=200092},{key='back-bar-fg',z=3000,pos={x=100,y=201},draw_order=200093},{key='front-body',z=3000,pos={x=102,y=199.9},draw_order=100091}}},
 {name='same-y-draw-and-x',frames={{key='fg',z=3000,pos={x=100,y=200},draw_order=200093},{key='body-right',z=3000,pos={x=101,y=200},draw_order=100090},{key='bg',z=3000,pos={x=100,y=200},draw_order=200092},{key='body-left',z=3000,pos={x=99,y=200},draw_order=100090}}},
 {name='z-and-sort-overrides',frames={{key='low-z',z=2000,pos={x=0,y=0},draw_order=1},{key='offset',z=3000,pos={x=0,y=200},sort_y_offset=2,draw_order=1},{key='explicit',z=3000,pos={x=0,y=0},sort_y=201,draw_order=1},{key='high-z',z=4000,pos={x=0,y=999},draw_order=1}}}
}
for _,case in ipairs(cases)do
 local inputs=J.decode(J.encode(case.frames));local store={entities={},render_frames=case.frames}
 update({},0,0,store)
 case.input=inputs;case.order={};for _,frame in ipairs(store.render_frames)do case.order[#case.order+1]=frame.key end;case.frames=nil
end
f=assert(io.open('analysis/native-painter-order-oracle.json','w'));f:write(J.encode(cases));f:close()
