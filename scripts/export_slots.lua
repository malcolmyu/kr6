EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J,V=require('dkjson'),require('klua.vector');v=V.v;r=V.r
local previous={ctx=ctx,mobile=IS_MOBILE,desktop=IS_DESKTOP,SlotView=SlotView,translate=_,director=director}
IS_MOBILE=true;IS_DESKTOP=false;ctx={sw=1365.3333333333,sh=768,bs={x=1,y=1},safe_frame=setmetatable({},{__index=function()return 0 end}),is_mobile=true,is_desktop=false,OVT=function(a)return a end}
local root='reference/apk/assets/gc64/kr6/data/kui_templates/';local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua')
local function expand(n)
 if n.WHEN==false or n.UNLESS==true then return end
 local out=n.template_name and expand(dofile(root..n.template_name..'.lua'))or{}
 for k,a in pairs(n)do if k~='children'and k~='template_name'then out[k]=a end end
 if n.children then out.children={};for _,c in ipairs(n.children)do local item=expand(c);if item then out.children[#out.children+1]=item end end end
 if out.text_key then out.text=strings[out.text_key]or out.text end
 return out
end
local screen=expand(dofile(root..'screen_slots.lua'));local function find(n,id)if n.id==id then return n end;for _,c in ipairs(n.children or{})do local r=find(c,id);if r then return r end end end
local panel=find(screen,'group_slots_list');local start=find(screen,'group_start');local button=find(start,'button_start');button.pos={x=0,y=-117.35};button.alpha=1
local atlas=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/screen_main_menu.lua');local frames,images={},{}
local function add(name)if not name then return end;for key,frame in pairs(atlas)do if key==name or table.contains(frame.alias,name)then frames[name]=frame;images[name]={x=frame.size[1]/2,y=frame.size[2]/2};return end end;error('Missing original menu image '..name)end
local function visit(n)for _,k in ipairs({'image_name','default_image_name','focus_image_name'})do add(n[k])end;for _,c in ipairs(n.children or{})do visit(c)end end;visit(panel);visit(start)
local out={panel=panel,start=start,images=images,labels={name=strings.SLOT_NAME_UPPER,choose=strings.MAIN_MENU_SELECT_SLOT},width=ctx.sw,height=ctx.sh}
local f=assert(io.open('public/data/slots.json','w'));f:write(J.encode(out));f:close();f=assert(io.open('analysis/power-icons.json','w'));f:write(J.encode(frames));f:close();assert(os.execute('python3 scripts/export_gui_icons.py')==0)
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/screen_slots.lua 1588 1635 1665 919 554 577')==0)
local functions={};for _,line in ipairs({1588,1635,1665,919,554,577})do functions[line]=assert(loadfile('analysis/function-bytecode/screen_slots_line'..line..'.lua'))end
local function bind(fn,values)for i=1,20 do local n=debug.getupvalue(fn,i);if not n then break end;assert(values[n],n);debug.setupvalue(fn,i,values[n])end end
local U,GS=require('utils'),require('game_settings');_ =function(key)return strings[key]or key end;SlotView={super={initialize=function()end}}
local rows={}
for index=1,3 do for _,value in ipairs({false,{levels={{}}},{levels={{stars=3}}},{levels={{stars=3,[3]=true},{stars=2}}},{levels={{stars=3,[3]=true},{stars=3,[3]=true},{stars=3,[3]=true}}}})do
 local slot=value and table.deepclone(value)or nil;local nodes={};local function node(id)return {id=id,hidden=false,text='',focus=function(self)self.focused=true end}end
 for _,id in ipairs({'slot_used','slot_empty','slot_delete','slot_delete_request','slot_delete_cancel','slot_delete_confirm','label_stars','label_slot_name'})do nodes[id]=node(id)end
 local self={id='slot_'..index,get_child_by_id=function(_,id)return nodes[id]end};local selected,deleted
 local storage={load_slot=function()return slot end,get_slot_stats=function()return 0,0,0 end,delete_slot=function(_,id)deleted=id;slot=nil end}
 local bindings={storage=storage,U=U,GS=GS,S={queue=function()end},screen={handle_slot_button=function(_,id)selected=id end}}
 for _,line in ipairs({1588,1635,1665})do bind(functions[line],bindings)end
 self.show=functions[1635];self.delete_slot=functions[1665];functions[1588](self)
 local function snap()return {used=not nodes.slot_used.hidden,empty=not nodes.slot_empty.hidden,delete=not nodes.slot_delete.hidden,stars=nodes.label_stars.text,name=nodes.label_slot_name.text}end
 local initial=snap();local actions={}
 if value then nodes.slot_delete_request.on_click();actions.request=snap();nodes.slot_delete_cancel.on_click();actions.cancel=snap();nodes.slot_delete_request.on_click();nodes.slot_delete_confirm.on_click();actions.confirm=snap()else nodes.slot_empty.on_click()end
 rows[#rows+1]={index=index,slot=value,initial=initial,actions=actions,selected=selected,deleted=deleted}
end end
f=assert(io.open('analysis/slots-view-oracle.json','w'));f:write(J.encode(rows));f:close()
local routes={};for index=1,3 do for _,used in ipairs({false,true})do
 local slot=used and{levels={{stars=3}}}or nil;local active,created;local d={};director=d;local result
 local storage={load_slot=function()return slot end,create_slot=function(_,id)created=id;slot={}end,set_active_slot=function(_,id)active=id end,save_slot=function()end}
 bind(functions[919],{signal={emit=function()end},storage=storage,director=d});functions[919]({done_callback=function(args)result=args end},index)
 routes[#routes+1]={index=index,used=used,active=active,created=created,next=d.next_item_name or result.next_item_name}
end end
f=assert(io.open('analysis/slots-route-oracle.json','w'));f:write(J.encode(routes));f:close()
local panelFrames={};for _,phase in ipairs({'in','out'})do
 local timer=require('hump.timer').new();local sl={children={},pos={x=out.width/2,y=phase=='in'and panel.pos_hidden.y or panel.pos_shown.y},pos_hidden=panel.pos_hidden,pos_shown=panel.pos_shown,hidden=phase=='in',disabled=false,disable=function(self)self.disabled=true end,enable=function(self)self.disabled=false end}
 local startButton={focus=function()end};local wid=function(id)return id=='group_slots_list'and sl or startButton end
 local fn=functions[phase=='in'and 554 or 577];bind(fn,{wid=wid,timer=timer});fn(sl)
 local values={};for frame=0,18 do if frame>0 then timer:update(1/30)end;values[#values+1]={y=sl.pos.y,hidden=sl.hidden,disabled=sl.disabled}end
 panelFrames[phase]=values
end
out.panelFrames=panelFrames
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/kviews_gg.lua 1437 1461 1482 1574 1669')==0)
local km=require('klua.macros');local log=require('klua.log'):new('slots-export');local Timeline={};local oldKView=KView;KView={initialize=function()end}
for name,line in pairs({initialize=1437,reset=1461,start=1482,update=1574,do_row=1669})do local fn=assert(loadfile('analysis/function-bytecode/kviews_gg_line'..line..'.lua'));bind(fn,{V=V,km=km,log=log});Timeline[name]=fn end
local timer=require('hump.timer').new();local window={ktw=require('klove.tween').new(timer)}
local function mock(n)local o=table.deepclone(n);o.pos=o.pos or V.v(0,0);o.scale=o.scale or V.v(1,1);o.alpha=o.alpha or 1;o.r=o.r or 0;o.ts=0;o.ci=find;o.get_window=function()return window end;local children={};for _,c in ipairs(o.children or{})do children[#children+1]=mock(c)end;o.children=children;o.update=function(self,dt)self.ts=self.ts+dt;for _,c in ipairs(self.children)do c:update(dt)end end;if o.class=='GGTimeline'then for name,fn in pairs(Timeline)do o[name]=fn end;o:initialize(o.size)end;return o end
local tl=mock(find(start,'timeline_start'));tl:start('anim_in');out.startFrames={};local function snapshot(n,result)if n.id then result[n.id]={n.pos.x,n.pos.y,n.scale.x,n.scale.y,n.alpha,n.r,n.hidden or false}end;for _,c in ipairs(n.children)do snapshot(c,result)end end
for frame=0,16 do local row={};snapshot(tl,row);out.startFrames[#out.startFrames+1]=row;timer:update(1/30);tl:update(1/30)end
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/screen_slots.lua 69 871')==0)
local update=assert(loadfile('analysis/function-bytecode/screen_slots_line871.lua'));local fts=assert(loadfile('analysis/function-bytecode/screen_slots_line69.lua'));local began
local s={window={update=function()end},ts=0,shake=false,shake_complete=false,shake_duration=.4,shake_amplitude=.6,shake_frequency=4.5,shake_phase=3,bg_exo_animations={pos={x=0,y=0},center={x=0,y=0}},logo_exo_animations={pos={x=0,y=0},center={x=0,y=0}},try_play_kr6_slot_button=function()end}
bind(update,{timer=require('hump.timer').new(),fts=fts,U=U,wid=function(id)return {start=function()if id=='timeline_start'then began=s.ts end end}end})
out.menuFrames={};update(s,2/30)
for frame=0,90 do if frame>0 then update(s,1/30)end;out.menuFrames[#out.menuFrames+1]={dx=s.bg_exo_animations.pos.x,dy=s.bg_exo_animations.pos.y,startAge=began and s.ts-began}end
KView=oldKView
f=assert(io.open('public/data/slots.json','w'));f:write(J.encode(out));f:close()
ctx,IS_MOBILE,IS_DESKTOP,SlotView,_=previous.ctx,previous.mobile,previous.desktop,previous.SlotView,previous.translate
director=previous.director
print('Native KR6 three-slot layout,15 row states/delete flows and6 fresh/existing routes exported')

-- GG5Button keeps its default art and appends a separately centred focus halo.
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/kviews_gg_sequels.lua 74')==0)
local button_init=assert(loadfile('analysis/function-bytecode/kviews_gg_sequels_line74.lua'))
local previousButton,previousImage=GGImageButton,KImageView
GGImageButton={initialize=function(self,name)self.size=table.deepclone(out.images[name]);self.children={}end}
KImageView={new=function(_,name)return {size=table.deepclone(out.images[name]),anchor={},isInstanceOf=function()return false end}end}
local button_rows={}
local function button_cases(n)
 if n.class=='GG5Button'and n.default_image_name and n.focus_image_name then
  local b=table.deepclone(n);b.add_child=function(self,child,index)self.children[#self.children+1]=child;self.insert_order=index end
  button_init(b,b.default_image_name,b.focus_image_name)
  button_rows[#button_rows+1]={id=b.id,base=out.images[b.default_image_name],halo=out.images[b.focus_image_name],offset=b.image_offset or{x=0,y=0},anchor=b.halo_image.anchor,order=b.insert_order}
 end
 for _,c in ipairs(n.children or{})do button_cases(c)end
end
button_cases(panel);button_cases(start)
f=assert(io.open('analysis/button-halo-oracle.json','w'));f:write(J.encode(button_rows));f:close()
GGImageButton,KImageView=previousButton,previousImage
