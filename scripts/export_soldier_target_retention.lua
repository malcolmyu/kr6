TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,SU,J=require('entity_db'),require('utils'),require('script_utils'),require('dkjson');local rows={}
require('grid_db').cell_type=function()return TERRAIN_LAND end;require('sound_db').queue=function()end
for _,name in ipairs({'hero_gerald','hero_zefira','soldier_knights_lvl1'})do for _,kind in ipairs({'missing','dead','banned','missing-reset'})do
 local h=E:create_entity(name);h.pos={x=500,y=350};h.nav_rally.pos={x=520,y=350};h.nav_rally.center={x=520,y=350};h.motion.arrived=true
 local e=E:create_entity('enemy_bandit');e.pos={x=560,y=350};e.health.hp=10000;e.heading={angle=math.pi};e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;e.motion.speed={x=-40,y=0}
 local other=E:create_entity('enemy_bandit');other.pos={x=560,y=350};other.health.hp=10000;other.heading={angle=math.pi};other.nav_path.pi=1;other.nav_path.spi=1;other.nav_path.ni=100;other.motion.speed={x=-40,y=0}
 local store={tick_ts=0,tick_length=TICK_LENGTH,entities={[h.id]=h,[e.id]=e}};U.block_enemy(store,h,e)
 -- One explicitly eligible replacement isolates stored-ID/blocker ownership;
 -- acquisition geometry/ranking is exercised by the separate original gates.
 local function find()if store.entities[other.id]then return other end end
 U.find_nearest_enemy=find;U.find_foremost_enemy=find
 local frames={};local label=function(id)return id==e.id and'first'or id==other.id and'second'or nil end
 for tick=1,60 do
  store.tick_ts=tick*TICK_LENGTH
  if tick==5 then if kind=='dead'then e.health.dead=true;e.health.hp=0 elseif kind=='banned'then e.vis.bans=bit.bor(e.vis.bans,F_BLOCK)else store.entities[e.id]=nil end end
  if tick==15 and kind=='missing-reset'then U.unblock_target(store,h)end
  if tick==25 then store.entities[other.id]=other end
  local target=SU.soldier_pick_melee_target(store,h)
  if target then SU.soldier_move_to_slot_step(store,h,target)else SU.soldier_go_back_step(store,h)end
  frames[#frames+1]={tick=tick,active=target and label(target.id),stored=label(h.soldier.target_id),pos=table.clone(h.pos),arrived=h.motion.arrived,firstBlockers=store.entities[e.id]and#e.enemy.blockers or 0,secondBlockers=#other.enemy.blockers}
 end
 rows[#rows+1]={name=name,kind=kind,frames=frames}
end end
local f=assert(io.open('analysis/soldier-target-retention-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original stored soldier target / blocker / return-to-rally traces')
