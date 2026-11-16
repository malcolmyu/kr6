local E=require('entity_db');local I=require('i18n');local J=require('dkjson')
I.msgs['zh-Hans']=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua');I.current_locale='zh-Hans'
local menus=require('data.tower_menus_data');local GU=require('gui_utils');local balance=require('data.balance.balance')
package.path='reference/apk/assets/gc64/kr6-phone/?.lua;'..package.path
local positions=require('data.game_gui_data').tower_menu_button_places
local gui=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/gui_common.lua')
assert(os.execute('cp reference/apk/assets/kr6-phone/fonts/GroboldovPoulos.ttf public/fonts/')==0)
local function clean(v)
  if type(v)=='function' then return end
  if type(v)~='table' then return v end
  local o={};for k,x in pairs(v)do o[k]=clean(x)end;return o
end
local out={positions=positions,menus={holder={}},sizes={},powerPositions=require('data.game_gui_data').tower_menu_power_places}
for _,item in ipairs(menus.holder[1])do if table.contains({'archers','knights','wizard','catapult','culverine'},item.type)then out.menus.holder[#out.menus.holder+1]=clean(item)end end
for _,kind in ipairs({'archers','knights','wizard','catapult','culverine'})do out.menus[kind]=clean(menus[kind])end
local frames={}
local function add(name)
  if not name then return end
  local frame=gui[name]
  if not frame then for _,f in pairs(gui)do for _,alias in ipairs(f.alias or {})do if alias==name then frame=f end end end end
  if frame then frames[name]=frame;out.sizes[name]=frame.size end
end
for _,kind in pairs(out.menus)do
  local levels=kind[1] and kind[1].action and {kind} or kind
  for _,items in ipairs(levels)do for _,item in ipairs(items)do
    for _,tt in ipairs(item.tt_list or{})do tt.tt_desc=GU.balance_format(tt.tt_desc,balance,{})end
    add(item.image);add(item.image..'_disabled');add(item.check)
  end end
end
for i=1,3 do add('ingame_ui_power_rank_000'..i..'_enabled');add('ingame_ui_power_rank_000'..i..'_disabled')end
for i=1,12 do add(string.format('effect_powerbuy_%04d',i))end
add('ingame_ui_price_tag');add('quickmenu_main_icon_locked')
local f=assert(io.open('analysis/power-icons.json','w'));f:write(assert(J.encode(frames)));f:close()
assert(os.execute('python3 scripts/export_gui_icons.py')==0)
local f=assert(io.open('public/data/tower-menu.json','w'));f:write(assert(J.encode(out)));f:close()
