EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J,V=require('dkjson'),require('klua.vector');local SU=require('screen_utils');local old={ctx=ctx,mobile=IS_MOBILE,desktop=IS_DESKTOP,target=KR_TARGET}
IS_MOBILE=true;IS_DESKTOP=false;KR_TARGET='phone';dofile('reference/apk/assets/gc64/all/constants.lua');v=V.v;r=V.r
ctx={sw=1400,sh=768,context='ingame',is_mobile=true,is_desktop=false,bs={},safe_frame=setmetatable({},{__index=function()return 0 end}),OVT=function(default,...)local args={...};for i=1,#args,2 do if args[i]=='phone'then return args[i+1]end end;return default end}
local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua');local root='reference/apk/assets/gc64/kr6/data/kui_templates/'
local function expand(n)
 if n.WHEN==false or n.UNLESS==true then return end
 local out=n.template_name and expand(dofile(root..n.template_name..'.lua'))or{}
 for k,a in pairs(n)do if k~='children'and k~='template_name'then out[k]=a end end
 if n.children then out.children={};for _,c in ipairs(n.children)do local child=expand(c);if child then out.children[#out.children+1]=child end end end
 if out.text_key then out.text=strings[out.text_key]or out.text end
 return out
end
local template=expand(dofile(root..'popup_ingame_options.lua'));local images,frames={},{}
local atlases={};for _,file in ipairs({'gui_popups','screen_main_menu','gui_common'})do local path='runtime/desktop_assets/kr6-phone/images/ipadhd/'..file..'.lua';local f=io.open(path);if f then f:close();for name,frame in pairs(dofile(path))do atlases[name]=frame;for _,alias in ipairs(frame.alias or{})do atlases[alias]=frame end end end end
local function add(name)if not name then return end;local f=assert(atlases[name],name);frames[name]=f;images[name]={x=f.size[1]/2,y=f.size[2]/2}end
local function visit(n)for _,key in ipairs({'image_name','default_image_name','focus_image_name','true_image_name','false_image_name','disabled_image_name'})do add(n[key])end;for _,c in ipairs(n.children or{})do visit(c)end end
visit(template)
-- GG5Slider replaces desktop music/sfx knob images with the original shared knob.
local confirmation=expand(dofile(root..'popup_message.lua'));visit(confirmation)
local out={template=template,confirmation=confirmation,images=images,scale=SU.get_default_base_scale(1400,768),labels={}}
for _,key in ipairs({'OPTIONS','OPTIONS_PAGE_HELP','OPTIONS_PAGE_CONTROLLER','OPTIONS_PAGE_SHORTCUTS','CONFIRM_RESTART','CONFIRM_EXIT','BUTTON_YES','BUTTON_NO'})do out.labels[key]=strings[key]or key end
local f=assert(io.open('public/data/options.json','w'));f:write(J.encode(out));f:close();f=assert(io.open('analysis/power-icons.json','w'));f:write(J.encode(frames));f:close();assert(os.execute('python3 scripts/export_gui_icons.py')==0)
ctx,IS_MOBILE,IS_DESKTOP,KR_TARGET=old.ctx,old.mobile,old.desktop,old.target;dofile('reference/apk/assets/gc64/all/constants.lua')
print('Original mobile in-game options and confirmation template/art exported')
local Timer,Tween=require('hump.timer'),require('klove.tween');local km=require('klua.macros');local log={debug=function()end,error=error}
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/kviews_gg_sequels.lua 385 450 1842 1998 2631')==0)
local function bind(fn,values)for i=1,30 do local n=debug.getupvalue(fn,i);if not n then break end;assert(values[n],n);debug.setupvalue(fn,i,values[n])end;return fn end
local previousPopup,previousIngame,previousMain,previousGame=GG5PopUp,GG5PopUpIngameOptions,main,game
GG5PopUp={static={fade_in_time=.25,fade_out_time=.15,slide_dist=-60}}
local show=bind(assert(loadfile('analysis/function-bytecode/kviews_gg_sequels_line385.lua')),{V=V,log=log});local hide=bind(assert(loadfile('analysis/function-bytecode/kviews_gg_sequels_line450.lua')),{log=log})
local timer=Timer.new();local window={ktw=Tween.new(timer),set_responder=function()end};local popup={hidden=true,contents={pos={x=0,y=0},alpha=1},pos_shown={x=0,y=0},colors={background={0,0,0,80}},children={},get_window=function()return window end,disable=function(self)self.disabled=true end,enable=function(self)self.disabled=false end}
local function pose()return {y=popup.contents.pos.y,alpha=popup.contents.alpha,background=popup.colors.background[4],disabled=not not popup.disabled,hidden=not not popup.hidden}end
show(popup);out.popupFrames={show={},hide={}};for i=0,12 do out.popupFrames.show[#out.popupFrames.show+1]=pose();timer:update(1/30)end
hide(popup);for i=0,8 do out.popupFrames.hide[#out.popupFrames.hide+1]=pose();timer:update(1/30)end
-- Execute the complete original mobile callback wiring, including inline confirmation ownership.
GG5PopUpIngameOptions={super={initialize=function()end,show=function()end}};main={params={volume_music=1,volume_fx=1}}
local audioRows={}
for _,initial in ipairs({{volume_music=0,volume_fx=0},{volume_music=.3,volume_fx=.7},{volume_music=1,volume_fx=1}})do
 local settings=table.deepclone(initial);local gains,events={},{};local nodes={};local confirmation={set_msg=function(self,msg)self.msg=msg end,set_ok_fn=function(self,fn)self.ok=fn end,show=function(self)self.visible=true end}
 local function node(id)return {id=id,set_value=function(self,value)self.value=value;if self.on_change then self:on_change(value)end end,set_knob_disabled=function(self,v)self.knobDisabled=v end,disable=function(self)self.disabled=true end,enable=function(self)self.disabled=false end,get_window=function()return {get_child_by_id=function()return confirmation end}end}end
 for _,id in ipairs({'button_restart','button_quit','button_close_popup','toggle_ingame_sfx','toggle_ingame_music','volume_music','volume_fx'})do nodes[id]=node(id)end
 local self={ci=function(_,id)return nodes[id]end,get_child_by_id=function(_,id)return nodes[id]end}
 local storage={load_settings=function()return table.deepclone(settings)end,save_settings=function(_,value)settings=table.deepclone(value)end}
 local S={queue=function(_,name)events[#events+1]=name end,set_main_gain_fx=function(_,v)gains.volume_fx=v end,set_main_gain_music=function(_,v)gains.volume_music=v end}
 game={game_gui={c_resume=function()events[#events+1]='resume'end,c_restart_game=function()events[#events+1]='restart'end,c_go_to_map=function()events[#events+1]='map'end}}
 local previousTranslate=_G._;_G._=function(key)return strings[key]or key end
 local init=bind(assert(loadfile('analysis/function-bytecode/kviews_gg_sequels_line1842.lua')),{storage=storage,log=log,S=S,km=km});local open=bind(assert(loadfile('analysis/function-bytecode/kviews_gg_sequels_line1998.lua')),{storage=storage})
 init(self);open(self)
 local rows={};local function snapshot(action)rows[#rows+1]={action=action,settings=table.deepclone(settings),music=nodes.toggle_ingame_music.value,sfx=nodes.toggle_ingame_sfx.value,musicKnob=not not nodes.volume_music.knobDisabled,sfxKnob=not not nodes.volume_fx.knobDisabled,gains=table.deepclone(gains),skipResume=self.skip_resume or false,events=table.deepclone(events)}end
 snapshot('show')
 for _,action in ipairs({'music','music','music:.2','music:0','music','sfx:.4','sfx','sfx','restart','restart-confirm','quit','quit-confirm','resume'})do
  if action=='music'then nodes.toggle_ingame_music:on_click()elseif action=='sfx'then nodes.toggle_ingame_sfx:on_click()
  elseif action:find(':')then local key,value=action:match('(.+):(.+)');nodes[key=='music'and'volume_music'or'volume_fx']:set_value(tonumber(value))
  elseif action=='restart'or action=='quit'then nodes[action=='restart'and'button_restart'or'button_quit']:on_click()
  elseif action:find('confirm')then confirmation.ok()else nodes.button_close_popup:on_click()end;snapshot(action)
 end
 _G._=previousTranslate;audioRows[#audioRows+1]={initial=initial,rows=rows}
end
GG5PopUp,GG5PopUpIngameOptions,main,game=previousPopup,previousIngame,previousMain,previousGame
f=assert(io.open('public/data/options.json','w'));f:write(J.encode(out));f:close();f=assert(io.open('analysis/options-audio-oracle.json','w'));f:write(J.encode(audioRows));f:close()
print('Native popup show/hide and complete audio/restart/quit callback traces exported')
local slider=bind(assert(loadfile('analysis/function-bytecode/kviews_gg_sequels_line2631.lua')),{km=km,log=log})
local function find(n,id)if n.id==id then return n end;for _,c in ipairs(n.children or{})do local a=find(c,id);if a then return a end end end
local bar=find(find(out.template,'volume_music'),'bar');local sliderRows={}
for _,range in ipairs({{0,1},{-2,3}})do for _,value in ipairs({-5,0,.2,.5,1,2,5})do
 local n={range=range,value_bar=table.deepclone(bar),knob={pos={x=0}},on_change=function(self,value)self.changed=value end};n.value_bar.scale={x=1,y=1};slider(n,value);sliderRows[#sliderRows+1]={range=range,input=value,value=n.value,phase=n.phase,knobX=n.knob.pos.x,changed=n.changed,bar=bar}
end end
f=assert(io.open('analysis/options-slider-oracle.json','w'));f:write(J.encode(sliderRows));f:close()
