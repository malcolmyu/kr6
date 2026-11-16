EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J,E,GS,U=require('dkjson'),require('entity_db'),require('game_settings'),require('utils')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/systems.lua 60 2102 2116')==0)
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/game_gui.lua 7897')==0)
local start=assert(loadfile('analysis/function-bytecode/systems_line60.lua'))
local init=assert(loadfile('analysis/function-bytecode/systems_line2102.lua'))
local insert=assert(loadfile('analysis/function-bytecode/systems_line2116.lua'))
local gui=assert(loadfile('analysis/function-bytecode/game_gui_line7897.lua'))
local kinds={'reinforcements','rain_of_fire','royal_edict'};local saved;local store
local function bind(fn,values)for i=1,30 do local key=debug.getupvalue(fn,i);if not key then break end;assert(values[key],key);debug.setupvalue(fn,i,values[key])end end
bind(init,{storage={load_slot=function()return saved end},apply_starting_xp=start,GS=GS,U=U})
bind(insert,{GS=GS,U=U,km=require('klua.macros')})
bind(gui,{GS=GS,U=U,game_gui={game=setmetatable({},{__index=function(_,key)if key=='store'then return store end end})},log={debug=function()end}})
local rules={};for _,key in ipairs({'powers_xp_thresholds','powers_starting_level','power_level_expected','power_level_expected_multipliers_above','power_level_expected_multipliers_below','power_xp_multipliers_per_mode'})do rules[key]=GS[key]end
local users={};for _,kind in ipairs(kinds)do users[kind]=E:create_entity('power_'..kind..'_control').user_power end
local rows={}
for _,xp in ipairs({0,5900,6000,15999,90000})do for _,player in ipairs({1,4,8,18,19})do for _,mode in ipairs({1,2,3,5})do
 saved={powers={status={}}};store={ephemeral={},selected_powers=kinds,player_level=player,level_mode=mode}
 for _,kind in ipairs(kinds)do saved.powers.status[kind]={xp=xp}end
 assert(init({},store));local buttons={}
 for _,kind in ipairs(kinds)do local parts={xp_bar={scale={x=0}},xp_level={}};buttons[kind]={power_name=kind,ci=function(_,id)return parts[id]end};gui(buttons[kind])end
 for use=0,13 do
  if use>0 then for _,kind in ipairs(kinds)do assert(insert({}, {user_power=users[kind]},store))end end
  local snapshot={xp=xp,playerLevel=player,mode=mode,use=use,status={}}
  for _,kind in ipairs(kinds)do gui(buttons[kind]);local state=store.ephemeral.powers_xp[kind];snapshot.status[kind]={base=state.xp,gain=state.xp_gain,level=state.level,fraction=buttons[kind]:ci('xp_bar').scale.x,display=buttons[kind]:ci('xp_level').text}end
  rows[#rows+1]=snapshot
 end
end end end
local f=assert(io.open('public/data/power-progression.json','w'));f:write(J.encode({rules=rules,users=users}));f:close()
f=assert(io.open('analysis/power-progression-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' native power XP initialization/use/GUI frames exported')
