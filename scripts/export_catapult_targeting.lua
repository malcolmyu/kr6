EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,P,G,S,SSO=require('entity_db'),require('utils'),require('path_db'),require('grid_db'),require('systems'),require('klove.sso')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local fn,rows=assert(loadfile('analysis/function-bytecode/scripts_game_line20186.lua')),{}
local bounds={left=-512/3,right=1024+512/3,bottom=0,top=768}
for stage=1,3 do
 local name=string.format('level%02d',stage);G:load(name);P:load(name,bounds)
 local data=dofile(KR_PATH_GAME..'/data/levels/'..name..'_data.lua');local holders={}
 for _,e in ipairs(data.entities_list)do if e.template:match('^tower_')and e.pos then holders[#holders+1]=e.pos end end
 for pi,lanes in ipairs(P.paths)do for ni=20,#lanes[1]-20,55 do for rank=1,4 do
  local tower=E:create_entity('tower_catapult_lvl'..rank);local p=lanes[1][ni];local best=math.huge
  for _,h in ipairs(holders)do local d=(h.x-p.x)^2+(h.y-p.y)^2;if d<best then best=d;tower.pos=table.clone(h)end end
  local store,actors,ops={entities={},visible_coords=bounds},{},{}
  for i=1,24 do
   local spi=(i-1)%3+1;local n=math.min(#lanes[spi],ni+math.floor((i-1)/12)*5);local e=E:create_entity('enemy_bandit');e.id=i*7;e.nav_path={pi=pi,spi=spi,ni=n};e.pos=table.clone(lanes[spi][n]);local next=lanes[spi][n+1]or e.pos;local f=(i%4)/4;e.pos.x=e.pos.x+(next.x-e.pos.x)*f;e.pos.y=e.pos.y+(next.y-e.pos.y)*f
   local speed=({0,40,72})[(i-1)%3+1];e.motion.speed={x=speed,y=0};e.motion.max_speed=speed;e.health.hp=i%13==0 and 0 or 1000;e.health.dead=e.health.hp<=0
   if i%7==0 then e.vis.bans=bit.bor(e.vis.bans,2)end;if i%11==0 then e.vis.flags=bit.bor(e.vis.flags,128)end;if i%17==0 then e.pending_removal=true end
   store.entities[e.id]=e;ops[#ops+1]={op='set',id=e.id};actors[#actors+1]={id=e.id,pi=pi,spi=spi,ni=n,pos=table.clone(e.pos),speed=speed,hp=e.health.hp,flags=e.vis.flags,bans=e.vis.bans,pending=e.pending_removal}
  end
  for _,id in ipairs({777,14,998,28})do store.entities[id]=nil;ops[#ops+1]={op='delete',id=id}end
  S.sso:on_update(1/30,1,store)
  local origin,flight={x=tower.pos.x+tower.tower.range_offset.x,y=tower.pos.y+tower.tower.range_offset.y},E:get_template(tower.attacks.list[1].bullet).bullet.flight_time
  local bindings={bft=flight,P=P,U=U,store=store,tpos=function()return origin end,this=tower,a=tower.attacks,get_direction=function(q)return origin.x<q.x and(origin.y<q.y and 1 or 2)or(origin.y<q.y and 4 or 3)end}
  for i=1,20 do local key=debug.getupvalue(fn,i);if not key then break end;assert(bindings[key],key);debug.setupvalue(fn,i,bindings[key])end
  local queries={}
  for _,predict in ipairs({false,true})do for dir=0,4 do
   local first,targets,pos=fn(tower.attacks.list[1],dir>0 and dir or nil,predict);local ids={};for _,e in ipairs(targets or{})do ids[#ids+1]=e.id end
   local raw={};SSO:filter(raw,'targets',origin.x,origin.y,tower.attacks.range+(predict and flight or 0)*150);local candidates={};for _,e in ipairs(raw)do candidates[#candidates+1]=e.id end
   queries[#queries+1]={seconds=predict and flight or 0,direction=dir,first=first and first.id,pos=pos,targets=ids,candidates=candidates}
  end end
  rows[#rows+1]={stage=stage,rank=rank,pos=table.clone(tower.pos),actors=actors,ops=ops,queries=queries}
 end end end
end
local f=assert(io.open('analysis/catapult-targeting-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original SSO/FFE catapult fixtures, '..#rows*10 ..' queries')
