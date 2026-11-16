EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 17989')==0)
local E,U,P,G,J=require('entity_db'),require('utils'),require('path_db'),require('grid_db'),require('dkjson');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local acquire=assert(loadfile('analysis/function-bytecode/scripts_game_line17989.lua'));local tower,store
local bindings={U=U,P=P,GR=G,band=bit.band,tpos=function(t)return{x=t.pos.x+t.tower.range_offset.x,y=t.pos.y+t.tower.range_offset.y}end}
local firebook,offNode=false,false;for _,flag in ipairs(arg)do if flag=='--firebook'then firebook=true elseif flag=='--off-node'then offNode=true end end;local attackIndex=firebook and 2 or 1
local rows={};local futureRejected=0
for stage=1,3 do
 local name=string.format('level%02d',stage);G:load(name);P:load(name,{left=-512/3,right=1024+512/3,bottom=0,top=768})
 local data=dofile(KR_PATH_GAME..'/data/levels/'..name..'_data.lua');local holders={}
 for _,e in ipairs(data.entities_list)do if e.template:match('^tower_')and e.pos and(not e['editor.game_mode']or e['editor.game_mode']==0 or e['editor.game_mode']==3)then holders[#holders+1]=e.pos end end
 for pi,lanes in ipairs(P.paths)do for spi,lane in ipairs(lanes)do
  local indexes={};for ni=1,#lane,25 do indexes[ni]=true end
  for ni=2,#lane do if P:is_node_valid(pi,ni)~=P:is_node_valid(pi,ni-1)then for offset=-12,1 do indexes[math.max(1,ni+offset)]=true end end end
  local sorted={};for ni in pairs(indexes)do sorted[#sorted+1]=ni end;table.sort(sorted)
  for _,ni in ipairs(sorted)do for _,speed in ipairs({0,40,72})do for rank=firebook and 4 or 1,4 do for _,source in ipairs(offNode and {'between-holder','node-boundary-inside','node-boundary-outside'}or{'nearest-holder','range-boundary'})do
   tower=E:create_entity('tower_wizard_lvl'..rank);local p=lane[ni];local best=math.huge
   for _,h in ipairs(holders)do local d=(h.x-p.x)^2+(h.y-p.y)^2;if d<best then best=d;tower.pos=table.deepclone(h)end end
   if source=='node-boundary-inside'or source=='node-boundary-outside'then tower.pos={x=p.x-tower.attacks.range+(source=='node-boundary-inside'and .000001 or-.000001),y=p.y-tower.tower.range_offset.y}end
   if source=='range-boundary'then tower.pos={x=p.x-tower.attacks.range+(ni%2==0 and .000001 or-.000001),y=p.y-tower.tower.range_offset.y}end
   store={entities={}};local actors={};local used={}
   for i,offset in ipairs({0,4,8})do local n=math.min(#lane,ni+offset);if not used[n]then used[n]=true
    local e=E:create_entity('enemy_bandit');e.nav_path={pi=pi,spi=spi,ni=n};e.pos=table.deepclone(lane[n]);if offNode then local next=lane[math.min(#lane,n+1)];local fraction=({.25,.5,.75})[(n-1)%3+1];e.pos.x=e.pos.x+(next.x-e.pos.x)*fraction;e.pos.y=e.pos.y+(next.y-e.pos.y)*fraction end;e.motion.speed={x=speed,y=0};e.health.hp=1000
    if firebook and i==3 then e.vis.flags=bit.bor(e.vis.flags,ni%2==0 and 128 or 256)end
    if i==2 and ni%2==0 then e.vis.bans=bit.bor(e.vis.bans,2)end
    store.entities[#store.entities+1]=e;actors[#actors+1]={id=e.id,ni=n,pos=table.deepclone(e.pos),speed=speed,flags=e.vis.flags,bans=e.vis.bans,currentValid=P:is_node_valid(pi,n),futureValid=P:is_node_valid(pi,n+P:predict_enemy_node_advance(e,tower.attacks.list[attackIndex].node_prediction)),inRange=U.is_inside_ellipse(e.pos,bindings.tpos(tower),tower.attacks.range)}
    if P:is_node_valid(pi,n)and not P:is_node_valid(pi,n+P:predict_enemy_node_advance(e,tower.attacks.list[attackIndex].node_prediction))then futureRejected=futureRejected+1 end
   end end
   bindings.this=tower;bindings.a=tower.attacks;bindings.store=store
   for i=1,20 do local n=debug.getupvalue(acquire,i);if not n then break end;assert(bindings[n],n);debug.setupvalue(acquire,i,bindings[n])end
   local first,targets=acquire(tower.attacks.list[attackIndex]);local ids={};for _,e in ipairs(targets or{})do ids[#ids+1]=e.id end
   rows[#rows+1]={attackIndex=attackIndex-1,stage=stage,rank=rank,pi=pi,spi=spi,source=source,pos=table.deepclone(tower.pos),actors=actors,targets=ids,first=first and first.id}
  end end end end
 end end
end
local path=offNode and(firebook and 'analysis/wizard-firebook-off-node-oracle.json'or'analysis/wizard-off-node-oracle.json')or(firebook and 'analysis/wizard-firebook-targeting-oracle.json'or'analysis/wizard-targeting-oracle.json')
local f=assert(io.open(path,'w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' native wizard acquisitions with original FFE/filter/path/grid; '..futureRejected..' actor forecasts leave target-valid nodes')
