EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J=require('dkjson');local GS=require('game_settings');local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua');local slot=dofile('reference/apk/assets/gc64/kr6/data/slot_template.lua')
local out={rewards=data.progression_rewards_premium,initial={powers=slot.powers.selected,heroes=slot.heroes.team,towers=slot.towers.selected},powerSlots=GS.number_of_powers,heroSlots=GS.number_of_heroes,towerSlots=GS.number_of_towers,starModes=GS.star_counting_modes}
local f=assert(io.open('public/data/progression.json','w'));f:write(J.encode(out));f:close()
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 2076')==0)
local fn=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line2076.lua'))
local bindings={GS=GS,storage={save_slot=function()end}}
for i=1,10 do local n=debug.getupvalue(fn,i);if not n then break end;assert(bindings[n],n);debug.setupvalue(fn,i,bindings[n])end
local rows={}
for _,selected in ipairs({{}, {'reinforcements'}, {'reinforcements','rain_of_fire'}, {'reinforcements','rain_of_fire','royal_edict'}, {'royal_edict','rain_of_fire'}})do
 local user={powers={selected=table.deepclone(selected)},progression={last_stars=0}}
 screen_map={equip_unit=function(_,group,name,index)assert(group=='powers');user.powers.selected[index]=name end}
 local reward=data.progression_rewards_premium[3]
 fn({},reward,user)
 rows[#rows+1]={before=selected,after=user.powers.selected,lastStars=user.progression.last_stars}
end
f=assert(io.open('analysis/progression-auto-equip-oracle.json','w'));f:write(J.encode(rows));f:close()
local towerRows={}
for _,reward in ipairs(data.progression_rewards_premium)do if reward.name=='tower_wizard'or reward.name=='tower_culverine'then
 for _,selected in ipairs({{}, {'archers'}, {'archers','knights','catapult'}, {'catapult','wizard','archers','knights'}, {'archers','knights','catapult','wizard','culverine'}, {'wizard','catapult'}})do
  local user={towers={selected=table.deepclone(selected)},progression={last_stars=0}}
  screen_map={equip_unit=function(_,group,name,index)assert(group=='towers');user.towers.selected[index]=name end}
  fn({},reward,user);towerRows[#towerRows+1]={name=reward.name,before=selected,after=user.towers.selected,lastStars=user.progression.last_stars}
 end
end end
f=assert(io.open('analysis/tower-auto-equip-oracle.json','w'));f:write(J.encode(towerRows));f:close()
