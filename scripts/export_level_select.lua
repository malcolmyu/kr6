EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J,V,GS=require('dkjson'),require('klua.vector'),require('game_settings')
local old={mobile=IS_MOBILE,desktop=IS_DESKTOP,target=KR_TARGET,ctx=ctx,translate=_G._,popup=GG5PopUpLevelSelect,map=screen_map}
IS_MOBILE=false;IS_DESKTOP=true;KR_TARGET='desktop';dofile('reference/apk/assets/gc64/all/constants.lua');v=V.v;r=V.r
ctx={sw=1365.3333333333,sh=768,is_mobile=false,is_desktop=true,bs={},safe_frame=setmetatable({},{__index=function()return 0 end}),OVT=function(a)return a end}
local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua');_G._=function(key)return strings[key]or key end
local root='reference/apk/assets/gc64/kr6/data/kui_templates/'
local function expand(node)
 if node.WHEN==false or node.UNLESS==true then return end
 local result=node.template_name and expand(dofile(root..node.template_name..'.lua'))or{}
 for k,value in pairs(node)do if k~='children'and k~='template_name'then result[k]=value end end
 if node.children then result.children={};for _,child in ipairs(node.children)do local expanded=expand(child);if expanded then result.children[#result.children+1]=expanded end end end
 if result.text_key then result.text=_G._(result.text_key)end
 return result
end
local template=expand(dofile(root..'window_level_select.lua'))
local function write(path,value)local f=assert(io.open(path,'w'));f:write(J.encode(value));f:close()end
local titles={};for level=1,3 do titles[level]=_G._('LEVEL_'..level..'_TITLE')end
write('analysis/level-select-font-input.json',titles)
assert(os.execute('python3 scripts/measure_level_select_fonts.py')==0)
local f=assert(io.open('analysis/level-select-font-widths.json'));local widths=assert(J.decode(f:read('*a')));f:close()
local atlas={};for _,name in ipairs({'room_level_select','room_common','gui_common','room_tower'})do for key,frame in pairs(dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/'..name..'.lua'))do atlas[key]=frame;for _,alias in ipairs(frame.alias or{})do atlas[alias]=frame end end end
local frames,images={},{ }
local function add(name)if not name then return end;local frame=assert(atlas[name],name);frames[name]=frame;images[name]={x=frame.size[1]/2,y=frame.size[2]/2}end
-- Other modes are outside the requested first three campaign/iron pairs. Their
-- native disabled tabs remain; their large equipment/roster trees are not loaded.
local function prune(node)
 if node.id and node.id:match('^group_mode_.*_info$')and node.id~='group_mode_campaign_info'and node.id~='group_mode_iron_info'then node.children={};return end
 for _,child in ipairs(node.children or{})do prune(child)end
end
prune(template)
local mapData=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 46 62 8187 8356 8909 9214')==0)
local function load(line)return assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line'..line..'.lua'))end
local function bind(fn,values)for i=1,30 do local name=debug.getupvalue(fn,i);if not name then break end;assert(values[name],name);debug.setupvalue(fn,i,values[name])end;return fn end
local log={debug=function()end,error=error};local setClick=bind(load(46),{log=log});local modesUnlocked=load(62);local user
local storage={load_slot=function()return user end};local sound={queue=function()end};local features={demo=false}
local init=bind(load(8187),{map_data=mapData,storage=storage,features=features,S=sound,is_modes_unlocked=modesUnlocked,set_on_click=setClick})
local show=bind(load(8356),{GS=GS,storage=storage,set_on_click=setClick,S=sound})
local LU={load_data=function(options)local data=dofile('reference/apk/assets/gc64/kr6/data/levels/'..options.level_name..'_data.lua');local overrides=data.level_mode_overrides[options.level_mode]or{};for k,value in pairs(overrides)do data[k]=value end;return data end}
local mode=bind(load(8909),{storage=storage,GS=GS,map_data=mapData,LU=LU,log=log,features=features,GU={},S=sound,kui_db={},set_on_click=setClick})
GG5PopUpLevelSelect={super={initialize=function()end,show=function()end}}
local states,oracle={},{ }
local function native(node,parent)
 local n=table.deepclone(node);n.parent=parent;n.children={};n.scale=n.scale or{x=1,y=1}
 function n:ci(id)if self.id==id then return self end;for _,child in ipairs(self.children)do local found=child:ci(id);if found then return found end end end
 n.get_child_by_id=n.ci
 function n:set_image(name)self.image_name=name end
 function n:enable()self.disabled=false end
 function n:disable()self.disabled=true end
 function n:get_wrap_lines()return assert(widths[self.text],self.text)end
 for _,child in ipairs(node.children or{})do n.children[#n.children+1]=native(child,n)end
 return n
end
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for key,value in pairs(a)do if not same(value,b[key])then return false end end
 for key in pairs(b)do if a[key]==nil then return false end end
 return true
end
local function patches(source,node,path,result)
 local patch={};for _,key in ipairs({'hidden','image_name','text','size'})do local value=node[key];if value~=nil and not same(value,source[key])then patch[key]=value end end
 if next(patch)then result[path]=patch end
 for index,child in ipairs(source.children or{})do patches(child,node.children[index],path..'.'..index,result)end
end
for level=1,3 do states[level]={}
 for _,won in ipairs({false,true})do
  user={levels={}};for index=1,3 do user.levels[index]={stars=index==level and won and 3 or 0};if index==level and won then user.levels[index][1]=2 end end
  screen_map={progression_rewards=mapData.progression_rewards_premium,total_stars=won and 3 or 0,tower_order=mapData.tower_order_free,is_seen=function()return true end}
  for _,gameMode in ipairs({1,3})do
   local n=native(template);n.level_idx=level;n.get_window=function()return{ci=function()return{disable=function()end,clear_touches=function()end}end}end
   n.load_rosters=function()end;n.update_difficulty=load(9214);n.show_mode=mode
   local group=n:ci('group_toggles_modes');group.toggles=group.children
   group.get_active_toggle=function(self)return self.active end
   for _,toggle in ipairs(group.toggles)do toggle.on_click=function(self)group.active=self;group.on_click_toggle(self)end end
   init(n);show(n,level,won and 3 or 0,2);mode(n,gameMode)
   local key,result=tostring(gameMode)..(won and '-won'or'-new'),{};patches(template,n,'0',result);states[level][key]=result
   local info=n:ci('group_mode_'..(gameMode==1 and'campaign'or'iron')..'_info')
   oracle[#oracle+1]={stage=level,mode=gameMode,won=won,selectHidden=n:ci('button_select').hidden,lockedHidden=n:ci('button_select_locked').hidden,title=n:ci('label_level_select_title').text,history=n:ci('label_level_select_description').text,infoVisible=not info.hidden,titleWidth=n:ci('title_bg').size.x}
  end
 end
end
local function visit(node)
 for _,key in ipairs({'image_name','default_image_name','focus_image_name','true_image_name','false_image_name','disabled_image_name'})do add(node[key])end
 for _,child in ipairs(node.children or{})do visit(child)end
end
visit(template);for level=1,3 do add(string.format('level_select_stage_preview%04d',level))end
for _,name in ipairs({'archers','knights','catapult','wizard'})do add('icon_room_tower_'..name)end
for i=1,4 do add(string.format('level_select_difficulty_icons_%04d',i))end
f=assert(io.open('public/data/options.json'));local options=assert(J.decode(f:read('*a')));f:close()
write('public/data/level-select.json',{template=template,states=states,images=images,scale=require('screen_utils').get_default_base_scale(ctx.sw,ctx.sh),popupFrames=options.popupFrames})
write('analysis/level-select-oracle.json',oracle);write('analysis/power-icons.json',frames);assert(os.execute('python3 scripts/export_gui_icons.py')==0)
IS_MOBILE,IS_DESKTOP,KR_TARGET,ctx,_G._,GG5PopUpLevelSelect,screen_map=old.mobile,old.desktop,old.target,old.ctx,old.translate,old.popup,old.map;dofile('reference/apk/assets/gc64/all/constants.lua')
assert(os.execute('cp reference/apk/assets/kr6-phone/fonts/NotoSansCJKsc-Regular.otf public/fonts/')==0)
print('12 native level-select campaign/iron states and original popup art exported; font measurement isolated with supplied font')
