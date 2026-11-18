local json=require('dkjson')
local exos,atlas,textures,animations={},{},{},{}
for _,group in ipairs({'go_enemies_T1','go_commons','go_towers','go_towers_archers','go_towers_wizard','go_towers_knights','go_towers_catapult','go_towers_culverine','go_decals','go_power_reinforcements','go_power_rain_of_fire','go_power_royal_edict','go_hero_gerald','go_hero_zefira','go_hero_bolin'}) do
  for name,frame in pairs(dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/'..group..'.lua')) do
    atlas[name]=frame;textures[frame.a_name]=true
  end
  for file in io.popen('find reference/apk/assets/gc64/kr6/data/exoskeletons/'..group..' -name "*.exo3" 2>/dev/null'):lines() do
    exos[file:match('([^/]+)%.exo3$')]=dofile(file)
  end
  for file in io.popen('find reference/apk/assets/gc64/kr6/data/animations/'..group..' -name "*.lua" 2>/dev/null'):lines() do
    for name,animation in pairs(dofile(file)) do animations[name]=animation end
  end
end
local base=dofile('reference/apk/assets/gc64/kr6/data/game_animations.lua').animations
for name,animation in pairs(base)do if name:match('^blood_pool_')or name=='explosion_KR5_big'then animations[name]=animation end end
local files={};for file in pairs(textures) do files[#files+1]=file;os.execute('cp runtime/desktop_assets/kr6-phone/images/ipadhd/'..file..' public/assets/') end
local f=assert(io.open('public/data/towers-art.json','w'));f:write(assert(json.encode({atlas=atlas,exos=exos,textures=files,animations=animations})));f:close()
-- Export only these GUI sprites; pixel extraction leaves the source art unchanged.
local gui=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/gui_common.lua')
local icons={}
for _,kind in ipairs({'reinforcements','rain_of_fire','royal_edict'}) do
  local name='in_game_icon_power_'..kind
  icons[name]=assert(gui[name])
end
local f=assert(io.open('analysis/power-icons.json','w'));f:write(assert(json.encode(icons)));f:close()
assert(os.execute('python3 scripts/export_gui_icons.py')==0)
