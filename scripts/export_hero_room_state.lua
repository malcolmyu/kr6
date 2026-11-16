EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J=require('dkjson');local V=require('klua.vector');local km=require('klua.macros');local log=require('klua.log'):new('hero-room-export')
local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua');package.loaded['data.map_data']=data
local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua');_=function(key)return strings[key]or key end
local menu=ROOM_STATE_KIND or'hero';local outputPath='public/data/'..menu..'-room.json'
local balance=require('data.balance.balance');local GU=require('gui_utils');local out=J.decode(assert(io.open(outputPath)):read('*a'))
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 5645 5687 5761 5791 5817 5824 5867 5893')==0)
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/kviews_gg.lua 1437 1461 1482 1574 1669')==0)
local function find(n,id)if n.id==id then return n end;for _,c in ipairs(n.children or{})do local r=find(c,id);if r then return r end end end
local tree=find(out.template,menu=='global'and'group_power_lvl_tree_1'or'group_'..menu..'_lvl_tree');local rootId=menu=='global'and'button_upgrade_1_7'or menu=='power'and'button_upgrade_5_5'or'button_upgrade_3_5';local button=find(tree,rootId);out.stateRootId=rootId
local function bind(fn,bindings)for i=1,99 do local n=debug.getupvalue(fn,i);if not n then break end;assert(bindings[n],n);debug.setupvalue(fn,i,bindings[n])end;return fn end
local methods={};for name,line in pairs({initialize=5645,set_upgrade=5687,set_picked=5761,set_available=5791,set_unreachable=5817,set_unavailable=5824,set_swapable=5867,select=5893})do methods[name]=bind(assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line'..line..'.lua')),{log=log,GU=GU,balance=balance})end
GG5Button={initialize=function()end};GGHexGrid={}
local function newButton(tt,picked)
 local n=table.deepclone(tt);n.pos=n.pos or V.v(0,0);n.ci=find;n.map_data=data;n.is_upgrade_picked=function()return picked end
 n.get_parent_of_class=function()return{menu_type=menu,show_tooltip=function()end}end
 local function add(c)c.set_image=function(self,name)self.image_name=name end;for _,a in ipairs(c.children or{})do add(a)end end;add(n)
 for name,fn in pairs(methods)do n[name]=fn end;n:initialize();return n
end
local function snapshot(n,result)if n.id then result[n.id]={hidden=n.hidden or false,image=n.image_name,text=n.text,alpha=n.alpha}end;for _,c in ipairs(n.children or{})do snapshot(c,result)end end
out.nodeStates={}
local sources={'hero_gerald','hero_zefira'};if menu=='global'then sources=out.order end;if menu=='power'then sources={};for _,name in ipairs(out.order)do sources[#sources+1]='power_'..name end end
for _,hero in ipairs(sources)do out.nodeStates[hero]={}
 for id,config in pairs(data.data_upgrades[hero])do if type(config)=='table'and id~='origin'then
  local states={};out.nodeStates[hero][id]=states
  for _,state in ipairs({'picked','available','unavailable','unreachable','swapable'})do
   local n=newButton(button,state=='picked');n:set_upgrade(hero,id)
   if state~='picked'then n['set_'..state](n,'talent_1')end
   local snap={};snapshot(n,snap);states[state]=snap
   if state~='unreachable'then n:select();local selected={};snapshot(n,selected);states[state..'_selected']=selected end
  end
 end end
end
local Timer=require('hump.timer');local Tween=require('klove.tween');KView={initialize=function()end}
local timelineFns={};for name,line in pairs({initialize=1437,reset=1461,start=1482,update=1574,do_row=1669})do timelineFns[name]=bind(assert(loadfile('analysis/function-bytecode/kviews_gg_line'..line..'.lua')),{V=V,km=km,log=log})end
local function newNode(tt,window)
 local n=table.deepclone(tt);n.pos=n.pos or V.v(0,0);n.scale=n.scale or V.v(1,1);n.alpha=n.alpha or 1;n.r=n.r or 0;n.ts=0;n.ci=find;n.get_window=function()return window end
 local children={};for _,c in ipairs(n.children or{})do children[#children+1]=newNode(c,window)end;n.children=children
 n.update=function(self,dt)self.ts=self.ts+dt;for _,c in ipairs(self.children)do c:update(dt)end end
 if n.class=='GGTimeline'then for name,fn in pairs(timelineFns)do n[name]=fn end;n:initialize(n.size)end
 return n
end
out.timelines={}
local function traces(tt)
 if tt.class=='GGTimeline'then
  out.timelines[tt.id]={};local targets={};for _,row in ipairs(tt.timeline)do if row.id then targets[row.id]=true end end
  for _,seq in ipairs(tt.sequences)do
   local timer=Timer.new();local n=newNode(tt,{ktw=Tween.new(timer)});n:start(seq.name);local frames={}
   for frame=0,45 do local snap={};for id in pairs(targets)do local c=n:ci(id);if c then snap[id]={c.pos.x,c.pos.y,c.scale.x,c.scale.y,c.alpha,c.r,c.hidden or false}end end;frames[#frames+1]=snap;timer:update(1/30);n:update(1/30)end
   out.timelines[tt.id][seq.name]=frames
  end
 end
 for _,c in ipairs(tt.children or{})do traces(c)end
end
traces(out.template)
for hero,nodes in pairs(out.labels)do for id,labels in pairs(nodes)do if labels.title then labels.title=GU.balance_format(labels.title,balance,{hero_name=hero,upgrade_name=id})end;if labels.description then labels.description=GU.balance_format(labels.description,balance,{hero_name=hero,upgrade_name=id})end end end
local f=assert(io.open(outputPath,'w'));f:write(J.encode(out));f:close();print('Native '..menu..' room node states, selected states and timeline frames exported')
