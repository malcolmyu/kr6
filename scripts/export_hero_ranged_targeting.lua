TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,P,G,U,J=require('entity_db'),require('script_utils'),require('path_db'),require('grid_db'),require('utils'),require('dkjson');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local rows={};math.random=function()return .25 end
for stage=1,3 do
 local name=string.format('level%02d',stage);G:load(name);P:load(name,{left=-512/3,right=1024+512/3,bottom=0,top=768});local data=dofile(KR_PATH_GAME..'/data/levels/'..name..'_data.lua')
 for pi,lanes in ipairs(P.paths)do for spi,lane in ipairs(lanes)do
  local indexes={};for ni=1,#lane,25 do indexes[ni]=true end;for ni=2,#lane do if P:is_node_valid(pi,ni)~=P:is_node_valid(pi,ni-1)then for offset=-12,1 do indexes[math.max(1,ni+offset)]=true end end end
  local sorted={};for ni in pairs(indexes)do sorted[#sorted+1]=ni end;table.sort(sorted)
  for _,ni in ipairs(sorted)do for _,speed in ipairs({0,40,72})do for _,flying in ipairs({false,true})do for _,source in ipairs({'native-spawn','max-inside','max-outside','min-inside','min-outside'})do
   local h=E:create_entity('hero_zefira');h.pos=table.deepclone(data.custom_spawn_pos[2].pos);h.ranged.attacks[1].ts=-10;local a=h.ranged.attacks[1];local store={tick_ts=0,entities={}};local actors={}
   for i,offset in ipairs({0,4})do local n=math.min(#lane,ni+offset);local e=E:create_entity('enemy_bandit');e.nav_path.pi=pi;e.nav_path.spi=spi;e.nav_path.ni=n;e.health.hp=1000;e.pos=table.clone(lane[n]);local next=lane[math.min(n+1,#lane)];e.pos.x=e.pos.x+(next.x-e.pos.x)*.5;e.pos.y=e.pos.y+(next.y-e.pos.y)*.5;e.motion.speed={x=speed,y=0};if flying then e.vis.flags=bit.bor(e.vis.flags,F_FLYING)end
    local future=n+P:predict_enemy_node_advance(e,a.node_prediction);local pred=P:node_pos(pi,spi,future)
    if i==1 and source~='native-spawn'then local radius=source:match('^max')and a.max_range or a.min_range;h.pos={x=pred.x-radius+(source:match('inside$')and .000001 or-.000001),y=pred.y}end
    store.entities[e.id]=e;actors[#actors+1]={id=e.id,ni=n,pos=table.clone(e.pos),speed=speed,flags=e.vis.flags,bans=e.vis.bans,futureValid=P:is_node_valid(pi,future),predicted=pred}
   end
   local target,attack,predicted=SU.soldier_pick_ranged_target_and_attack(store,h);rows[#rows+1]={stage=stage,pi=pi,spi=spi,source=source,flying=flying,heroPos=table.clone(h.pos),actors=actors,target=target and target.id,ready=attack~=nil,predicted=predicted}
  end end end end
 end end
end
local f=assert(io.open('analysis/hero-ranged-targeting-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original hero ranged FFE acquisitions exported; half-node poses, min/max ellipse edges, ground/flying, future node validity')
