EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,GU,GS=require('entity_db'),require('dkjson'),require('gui_utils'),require('game_settings')
local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua');local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua');_=function(key)return strings[key]or key end
local function read(path)return J.decode(assert(io.open(path)):read('*a'))end
local function write(path,value)local f=assert(io.open(path,'w'));f:write(J.encode(value));f:close()end
local function bind(fn,values)for i=1,30 do local name=debug.getupvalue(fn,i);if not name then break end;assert(values[name],name);debug.setupvalue(fn,i,values[name])end;return fn end
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 2522 4809 6008')==0)
assert(os.execute('luajit scripts/export_power_room_fit.lua')==0)
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/storage.lua 425')==0)
local slot,stars,player;local storage={load_slot=function()return slot end,save_slot=function()return true end}
PowerRoomView={super={get_unit_stats=function()end}};features={demo=false};GGHexGrid={}
local progressions=read('public/data/progression.json');local function unlocked(name)if name=='power_reinforcements'or name=='power_rain_of_fire'then return true end;for _,r in ipairs(progressions.rewards)do if r.name==name then return stars>=r.stars end end;return false end
local map={power_data=data.power_data_free,is_seen=function()return true end,is_content_stage_unlocked=function(_,name)return unlocked(name)end}
screen_map=map
local statsFn=bind(assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line4809.lua')),{features=features,storage=storage,screen_map=map,E=E,GU=GU,GS=GS,U={get_player_level=function()return player end},map_data=data,log={error=function()end}})
local statsRows={};local profiles={{},{[1]={campaign=1}},{[1]={campaign=3}},{[1]={campaign=3},[2]={campaign=1}},{[1]={campaign=3},[2]={campaign=3}},{[1]={campaign=3,iron=true},[2]={campaign=3},[3]={campaign=3}}}
for _,levels in ipairs(profiles)do stars=0;player=1;for _,v in pairs(levels)do stars=stars+v.campaign+(v.iron and 1 or 0);player=player+1 end
for _,kind in ipairs({'reinforcements','rain_of_fire','royal_edict'})do for _,xp in ipairs({0,5999,6000,16000,90000})do
 local selected=xp>=6000 and{'l2a'}or{};slot={powers={status={[kind]={xp=xp}}},upgrades_trees={['power_'..kind]=selected}}
 local self={get_unit_full_name=function(_,name)return'power_'..name end,is_iap_locked=function()return false end}
 local result=statsFn(self,kind);statsRows[#statsRows+1]={profile={levels=levels,powerXp={[kind]=xp},powerUpgrades={[kind]=selected}},kind=kind,result=result}
end end end
local graphRows,trees=read('analysis/power-upgrade-graph-oracle.json'),read('analysis/power-upgrade-patch-oracle.json');local pickRows={}
local pick=bind(assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line6008.lua')),{storage=storage,UPGR={set_levels=function()end},S={queue=function()end},log={error=function()end}})
for _,row in ipairs(trees)do local source='power_'..row.kind;local points=5-#row.selected;local graph
 for _,g in ipairs(graphRows)do if g.source==source and g.points==points and table.concat(g.selected,',')==table.concat(row.selected,',')then graph=g.result;break end end;assert(graph)
 for id,node in pairs(data.data_upgrades[source])do if type(node)=='table'and id~='origin'then
  slot={upgrades_trees={[source]=table.deepclone(row.selected)}};local blocked=graph.block_buttons[id]
  local self={map_data=data,group=source,idx=id,swapable=blocked~=nil,swapable_upgrade=blocked,unavailable=not graph.enable_buttons[id]and not blocked,is_upgrade_picked=function()return table.contains(row.selected,id)end,set_picked=function()end,get_parent_of_class=function()return{refresh_graph=function()end}end,play_buy_animation=function()end}
  pick(self);pickRows[#pickRows+1]={kind=row.kind,selected=row.selected,id=id,result=slot.upgrades_trees[source]}
 end end
end
local equipRows={};local equip=assert(loadfile('analysis/function-bytecode/storage_line425.lua'));stars=12
for _,selection in ipairs({{}, {'reinforcements'}, {'rain_of_fire'}, {'reinforcements','rain_of_fire'}, {'royal_edict','reinforcements'}, {'royal_edict','rain_of_fire'}})do for _,kind in ipairs({'reinforcements','rain_of_fire','royal_edict'})do if not table.contains(selection,kind)then for position=1,3 do
 slot={powers={status={[kind]={xp=0}},selected=table.deepclone(selection)}};equip(storage,'powers',kind,{'powers','selected'},position,0);equipRows[#equipRows+1]={selected=selection,kind=kind,position=position,result=slot.powers.selected}
end end end end
write('analysis/power-room-stats-oracle.json',statsRows);write('analysis/power-room-pick-oracle.json',pickRows);write('analysis/power-room-equip-oracle.json',equipRows)
local resets={}
for _,name in ipairs({'tower_wizard_lvl4','tower_archers_lvl4','tower_catapult_lvl4','tower_culverine_lvl4','tower_knights_lvl4'})do for _,enabled in ipairs({false,true})do
 local tower=E:create_entity(name);tower.pos={x=500,y=350};local before={}
 for _,group in ipairs({'attacks','timed_attacks'})do before[group]={};for i,a in ipairs(tower[group]and tower[group].list or{})do a.ts=i*10;before[group][i]={ts=a.ts,basic=a.basic_attack or false,static=a.static_cooldown or false}end end
 local buff=E:create_entity('mod_power_royal_edict_towerbuff');buff.modifier.target_id=tower.id;buff.reset_skills_cd=enabled
 assert(buff.main_script.insert(buff,{tick_ts=100,entities={[tower.id]=tower}}));local after={};for _,group in ipairs({'attacks','timed_attacks'})do after[group]={};for _,a in ipairs(tower[group]and tower[group].list or{})do after[group][#after[group]+1]=a.ts end end
 resets[#resets+1]={name=name,enabled=enabled,before=before,after=after}
end end
write('analysis/royal-skill-reset-oracle.json',resets)
print(#statsRows..' original power room stats, '..#pickRows..' native node confirmations/branch swaps and '..#equipRows..' native equipment slot writes exported')
