EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,V=require('entity_db'),require('dkjson'),require('klua.vector');v=V.v;r=V.r
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 5129')==0)
IS_MOBILE=false;IS_DESKTOP=true;KR_TARGET='desktop'
ctx={sw=1365.3333333333,sh=768,bs=setmetatable({},{__index=function()return{x=1,y=1}end}),safe_frame=setmetatable({},{__index=function()return 0 end}),is_mobile=false,is_desktop=true,OVT=function(a)return a end}
local data,strings=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua'),dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua')
local out=J.decode(assert(io.open('public/data/hero-room.json')):read('*a'));out.order=data.power_order_free;out.labels={};out.units={};out.nodes={};out.graphs={};out.text={};out.previewSlots=data.power_info_panel_upgrade_show
local root='reference/apk/assets/gc64/kr6/data/kui_templates/'
local function expand(n)if n.WHEN==false then return nil end;local o=n.template_name and expand(dofile(root..n.template_name..'.lua'))or{};for k,a in pairs(n)do if k~='template_name'and k~='children'then o[k]=a end end;if n.children then o.children={};for _,c in ipairs(n.children)do local e=expand(c);if e then o.children[#o.children+1]=e end end end;return o end
out.template=expand(dofile(root..'room_tower.lua'));out.slot=expand(dofile(root..'button_equipped_tower_slot.lua'))
out.roster=expand(dofile(root..'button_tower_portrait_roster.lua'))
local function find(n,id,path)path=path or{};path[#path+1]={id=n.id,pos=n.pos,scale=n.scale,anchor=n.anchor};if n.id==id then return n,path end;for _,c in ipairs(n.children or{})do local a,b=find(c,id,table.deepclone(path));if a then return a,b end end end
out.mapButton,out.mapButtonPath=find(expand(dofile(root..'group_map_hud_desktop.lua')),'button_map_powers')
out.backdrop=find(dofile(root..'screen_map.lua'),'modal_bg_rooms')
assert(#find(out.template,'button_selected_power_01').children>0,'power slot template did not expand')
local atlas,frames,missing={},{},{}
for _,name in ipairs({'room_tower','room_common','gui_common','screen_map_hud'})do for key,frame in pairs(dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/'..name..'.lua'))do atlas[key]=frame;for _,alias in ipairs(frame.alias or{})do atlas[alias]=frame end end end
local function add(name)if not name or name:match('^hero_skill_tree_main_icon_')then return end;local f=atlas[name];if not f then missing[name]=true;return end;frames[name]=f;out.images[name]={x=f.size[1]/2,y=f.size[2]/2}end
local function visit(n)if n.animation and n.animation.prefix then for i=n.animation.from or 1,n.animation.to or 1 do local name=n.animation.prefix..'_'..string.format('%04d',i);if atlas[name]then add(name)end end end;for _,k in ipairs({'image_name','default_image_name','focus_image_name','false_image_name','true_image_name','disabled_image_name'})do add(n[k])end;if n.text_key then n.text=strings[n.text_key]or n.text end;for _,c in ipairs(n.children or{})do visit(c)end end
visit(out.template);visit(out.slot);visit(out.roster);visit(out.mapButton)
visit(out.backdrop)
for _,name in ipairs({'attack','magic_attack','health','armor','range','respawn'})do add('room_stat_icon_'..name)end
local graph=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5129.lua'));debug.setupvalue(graph,1,{load=function(path)local rows={};for line in io.lines(path)do local row={};for cell in(line..'\t'):gmatch('(.-)\t')do row[#row+1]=cell end;rows[#rows+1]=row end;return rows end});local graphs=graph({allocate=function()return{}end},'/data/kui_templates/balance_hex.tsv').graphs
for _,kind in ipairs(out.order)do
 local source='power_'..kind;out.nodes[source]=data.data_upgrades[source];out.graphs[source]=graphs[source];out.labels[source]={}
 for id,node in pairs(out.nodes[source])do if type(node)=='table'then add(node.img);if node.img and atlas[node.img..'_disabled']then add(node.img..'_disabled')end;out.labels[source][id]={title=strings[node.title_key],description=strings[node.description_key]};if graphs[source][id]then graphs[source][id].cost=node.cost end end end
 for _,name in ipairs({'power_portraits_big_'..kind,'power_portraits_small_'..kind,'icon_room_power_'..kind})do add(name)end
 local t=assert(E:get_template(source..'_control'));local key='POWER_'..kind:upper();out.units[kind]={name=strings[key..'_NAME'],description=strings[key..'_DESC'],typeDescription=strings['POWER_TYPE_'..t.info.stat_type:upper()],stats=t.info,taunt=t.sound_events.room_select}
end
for _,key in ipairs({'MAP_BUTTON_POWERS','POWER_ROOM_EQUIPPED_POWERS','PLAYER_PROGRESSION_UNLOCK_STAR_NUMBER'})do out.text[key]=strings[key]end
out.xpExpected=require('game_settings').power_level_expected;out.showXpOffset=require('game_settings').show_xp_offset
local f=assert(io.open('public/data/power-room.json','w'));f:write(J.encode(out));f:close();f=assert(io.open('analysis/power-icons.json','w'));f:write(J.encode(frames));f:close();assert(os.execute('python3 scripts/export_gui_icons.py')==0)
for name in pairs(missing)do print('Missing power room image '..name)end
ROOM_STATE_KIND='power';dofile('scripts/export_hero_room_state.lua');ROOM_STATE_KIND=nil
print('Original power room artwork, nine-unit roster, labels and graphs exported')
