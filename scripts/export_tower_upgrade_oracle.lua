EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local E=require('entity_db');local S=require('systems');local sound=require('sound_db');local J=require('dkjson');local signal=require('hump.signal')
sound.queue=function()end;signal.emit=function()end
local inserted={};simulation={queue_insert_entity=function(_,e)inserted[#inserted+1]=e end,queue_remove_entity=function()end}
local results={}
for _,kind in ipairs({'archers','wizard','knights','catapult'})do
 for _,wave in ipairs({0,1})do
  local e=E:create_entity('tower_'..kind..'_lvl1');e.tower.spent=e.tower.price;e.tower.sell=true;e.tower.terrain_style=1;e.tower.holder_template='tower_holder_terrain_1_1'
  local store={entities={[e.id]=e},player_gold=1000,wave_group_number=wave,tick_ts=10}
  inserted={};S.tower_upgrade.on_update(nil,0,0,store)
  results[#results+1]={kind=kind,wave=wave,refund=store.player_gold-1000}
 end
 local e=E:create_entity('tower_'..kind..'_lvl1');e.tower.spent=e.tower.price;e.tower.upgrade_to='tower_'..kind..'_lvl2';e.tower.terrain_style=1;e.tower.holder_template='tower_holder_terrain_1_1'
 if e.barrack then e.barrack.rally_pos={x=567,y=352};local soldier=E:create_entity('soldier_knights_lvl1');soldier.health.hp=1;soldier.pos={x=600,y=350};soldier.nav_rally.center={x=567,y=352};e.barrack.soldiers={soldier}end
 local store={entities={[e.id]=e},player_gold=1000,wave_group_number=1,tick_ts=10}
 inserted={};S.tower_upgrade.on_update(nil,0,0,store)
 local row={kind=kind,cost=1000-store.player_gold}
 for _,v in ipairs(inserted)do if v.tower then row.spent=v.tower.spent elseif v.soldier then row.soldier={name=v.template_name,hp_max=v.health.hp_max,pos=v.pos}end end
 results[#results+1]=row
end
local f=assert(io.open('analysis/tower-upgrade-oracle.json','w'));f:write(assert(J.encode(results)));f:close()
