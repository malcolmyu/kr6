local json=require('dkjson')
local gui=dofile('reference/apk/assets/gc64/kr6-phone/data/game_gui_data.lua')
local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua')
local balloons={}
for name,config in pairs(gui.text_balloons) do
  config.localized_text=strings[config.text] or config.text
  balloons[name]=config
end
local E=require('entity_db')
local indicator=E:get_template('stage_01_tower_build_indicator')
local focus=E:get_template('screen_focus_circle')
local args=focus.render.sprites[1].shader_args
local file=assert(io.open('public/data/tutorial.json','w'));file:write(assert(json.encode({balloons=balloons,buildIndicator={render=indicator.render},focus={radius=focus.radius,inner=args.inner_radius_factor,maxAlpha=args.max_alpha}})));file:close()
