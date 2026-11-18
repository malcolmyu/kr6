local J=require('dkjson');local V=require('klua.vector');local SU=require('screen_utils')
main={params={}};v=V.v;r=V.r
local previous_target,previous_mobile=KR_TARGET,IS_MOBILE
KR_TARGET='desktop';IS_MOBILE=false;dofile('reference/apk/assets/gc64/all/constants.lua')
local gui=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/gui_common.lua')
local zero={l=0,r=0,t=0,b=0,lt=0,rt=0,lb=0,rb=0,tl=0,tr=0,bl=0,br=0}
local output={refWidth=GUI_REF_W,refHeight=GUI_REF_H,minAspect=MIN_SCREEN_ASPECT,maxAspect=MAX_SCREEN_ASPECT,safeDefaults=SAFE_FRAME_DEFAULTS,variants={},images={}}
local frames={}
local portraits=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/gui_portraits.lua')
for _,atlas in ipairs({gui,portraits})do
 local aliases={};for _,frame in pairs(atlas)do for _,alias in ipairs(frame.alias or {})do aliases[alias]=frame end end
 for name,frame in pairs(aliases)do atlas[name]=frame end
end
local function image(name)
  local frame=assert(gui[name] or portraits[name],name);frames[name]=frame
  output.images[name]={x=frame.size[1]/2,y=frame.size[2]/2}
end
for _,name in ipairs({'waveFlag_selected','waveFlag_0001','waveFlag_0002','waveFlag_0003','waveFlag_0004'})do image(name)end
for _,name in ipairs({'ingame_ui_gui_bottom_bar_DESKTOP','ingame_ui_gui_portraits_hero_bg','ingame_ui_gui_portraits_hero_bg_hover','ingame_ui_hero_portrait_bars_0001','ingame_ui_hero_portrait_bars_0002','ingame_ui_power_loading','ingame_ui_power_button_frame_inactive','ingame_ui_power_button_frame_select','ingame_ui_power_button_frame_active_hover','ingame_ui_power_button_input_frame','in_game_icon_power_reinforcements','in_game_icon_power_rain_of_fire','in_game_icon_power_royal_edict'})do image(name)end
for _,i in ipairs({1,3,4})do
  for _,prefix in ipairs({'hero_portraits','hero_portraits_selected','hero_portraits_disabled'})do image(string.format('%s_%04d',prefix,i))end
end
for i=1,13 do image(string.format('ingame_ui_power_button_doors_%04d',i))end
local function selected(node)return (node.WHEN==nil or node.WHEN) and not node.UNLESS end
for _,mobile in ipairs({false,true})do
  local scale=mobile and 1.53 or .7
  ctx={sw=1400,sh=768,is_mobile=mobile,safe_frame=zero,bs=setmetatable({hud=V.vv(scale),tower_menu=1},{__index=function()return V.vv(1)end})}
  ctx.OVT=function(default,...)
    local args={...};for i=1,#args,2 do if args[i]==(mobile and 'phone' or 'desktop')then return args[i+1]end end
    return default
  end
  local template=dofile('reference/apk/assets/gc64/kr6/data/kui_templates/game_gui.lua')
  local result={scale=scale}
  local function visit(node)
    if not selected(node)then return end
    if node.id=='hud_view' then
      result.hud=node;image(node.image_name)
    elseif node.id=='pause_button_view' then
      result.pause=node
      image(node.children[1].default_image_name);image(node.children[1].focus_image_name)
    end
    for _,child in ipairs(node.children or {})do visit(child)end
  end
  visit(template)
  assert(result.hud and result.pause)
  output.variants[mobile and 'mobile' or 'desktop']=result
end
local f=assert(io.open('analysis/power-icons.json','w'));f:write(assert(J.encode(frames)));f:close()
assert(os.execute('python3 scripts/export_gui_icons.py')==0)
local f=assert(io.open('public/data/hud.json','w'));f:write(assert(J.encode(output)));f:close()
-- Run the original layout helpers at several browser sizes, for both variants.
local cases={}
for _,mobile in ipairs({false,true})do
  IS_MOBILE=mobile
  KR_TARGET=mobile and 'phone' or 'desktop'
  -- Earlier exporters may have cached constants under another target. Execute
  -- the original target-dependent constants for each layout oracle explicitly.
  dofile('reference/apk/assets/gc64/all/constants.lua')
  for _,size in ipairs({{640,360},{1400,768},{1920,1080},{800,900},{2400,768},{375,812},{1024,768}})do
    local w,h=unpack(size)
    local sw,sh,scale,origin=SU.clamp_window_aspect(w,h,GUI_REF_W,GUI_REF_H)
    local safe=SU.get_safe_frame(w,h,GUI_REF_W,GUI_REF_H)
    cases[#cases+1]={w=w,h=h,mobile=mobile,expected={sw=sw,sh=sh,scale=scale,origin=origin,safe=safe}}
  end
end
local f=assert(io.open('analysis/gui-layout-oracle.json','w'));f:write(assert(J.encode(cases)));f:close()
KR_TARGET=previous_target;IS_MOBILE=previous_mobile;dofile('reference/apk/assets/gc64/all/constants.lua')
