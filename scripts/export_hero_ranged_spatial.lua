TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,SU,P,G,S,SSO=require('entity_db'),require('utils'),require('script_utils'),require('path_db'),require('grid_db'),require('systems'),require('klove.sso')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local rows,bounds={},{left=-512/3,right=1024+512/3,bottom=0,top=768}
for stage=1,3 do local name=string.format('level%02d',stage);G:load(name);P:load(name,bounds)
 for pi,lanes in ipairs(P.paths)do for ni=20,#lanes[1]-20,55 do for _,offset in ipairs({80,120,170,220})do
  local h=E:create_entity('hero_zefira');h.pos={x=lanes[1][ni].x-offset,y=lanes[1][ni].y+15};h.ranged.attacks[1].ts=-10
  local store,actors,ops={tick_ts=1,entities={},visible_coords=bounds},{},{}
  for i=1,24 do local spi=(i-1)%3+1;local n=math.min(#lanes[spi],ni+math.floor((i-1)/12)*5);local e=E:create_entity('enemy_bandit');e.id=i*7;e.nav_path={pi=pi,spi=spi,ni=n};e.pos=table.clone(lanes[spi][n]);local next=lanes[spi][n+1]or e.pos;local f=(i%4)/4;e.pos.x=e.pos.x+(next.x-e.pos.x)*f;e.pos.y=e.pos.y+(next.y-e.pos.y)*f
   local speed=({0,40,72})[(i-1)%3+1];e.motion.speed={x=speed,y=0};e.motion.max_speed=speed;e.health.hp=i%13==0 and 0 or 1000;e.health.dead=e.health.hp<=0
   if i%7==0 then e.vis.bans=bit.bor(e.vis.bans,2)end;if i%11==0 then e.vis.flags=bit.bor(e.vis.flags,128)end;if i%17==0 then e.pending_removal=true end
   store.entities[e.id]=e;ops[#ops+1]={op='set',id=e.id};actors[#actors+1]={id=e.id,pi=pi,spi=spi,ni=n,pos=table.clone(e.pos),speed=speed,hp=e.health.hp,flags=e.vis.flags,bans=e.vis.bans,pending=e.pending_removal}
  end
  for _,id in ipairs({777,14,998,28})do store.entities[id]=nil;ops[#ops+1]={op='delete',id=id}end
  S.sso:on_update(1/30,1,store)
  local target,attack,pos=SU.soldier_pick_ranged_target_and_attack(store,h);local a=h.ranged.attacks[1];local _,targets=U.find_foremost_enemy(store.entities,h.pos,a.min_range,a.max_range,a.node_prediction,a.vis_flags,a.vis_bans,nil,F_FLYING,nil)
  local raw,ids,candidates={},{},{};SSO:filter(raw,'targets',h.pos.x,h.pos.y,a.max_range+a.node_prediction*150);for _,e in ipairs(raw)do candidates[#candidates+1]=e.id end;for _,e in ipairs(targets or{})do ids[#ids+1]=e.id end
  rows[#rows+1]={stage=stage,pos=h.pos,actors=actors,ops=ops,target=target and target.id,predicted=pos,targets=ids,candidates=candidates}
 end end end
end
local f=assert(io.open('analysis/hero-ranged-spatial-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original hero ranged SSO/FFE acquisition fixtures')
