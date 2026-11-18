EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J=require('dkjson');local V=require('klua.vector');v=V.v;r=V.r
IS_MOBILE=false;IS_DESKTOP=true;KR_TARGET='desktop'
ctx={sw=1365.3333333333,sh=768,bs=setmetatable({},{__index=function()return{x=1,y=1}end}),safe_frame=setmetatable({},{__index=function()return 0 end}),is_mobile=false,is_desktop=true,OVT=function(a)return a end}
local root='reference/apk/assets/gc64/kr6/data/kui_templates/'
local function expand(node)
 if node.WHEN==false then return nil end
 local out={}
 if node.template_name then out=expand(dofile(root..node.template_name..'.lua'))or{}end
 for k,a in pairs(node)do if k~='template_name' and k~='children'then out[k]=a end end
 if node.children then out.children={};for _,c in ipairs(node.children)do local e=expand(c);if e then out.children[#out.children+1]=e end end end
 return out
end
local E=require('entity_db');local gs=require('game_settings');local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua');local gui=dofile('reference/apk/assets/gc64/kr6-phone/data/game_gui_data.lua')
local atlas={};for _,name in ipairs({'room_encyclopedia','encyclopedia','encyclopedia_thumbs','screen_map_hud','gui_common','room_common'})do for key,frame in pairs(dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/'..name..'.lua'))do atlas[key]=frame;for _,alias in ipairs(frame.alias or{})do atlas[alias]=frame end end end
local frames,images={},{}
local function add(name)if not name or not atlas[name]then return nil end;local f=atlas[name];frames[name]=f;images[name]={x=f.size[1]/2,y=f.size[2]/2};return name end
local template=expand(dofile(root..'group_encyclopedia_room_desktop.lua'))
local function visit(n)for _,key in ipairs({'image_name','default_image_name','focus_image_name','false_image_name','true_image_name','disabled_image_name'})do add(n[key])end;if n.text_key then n.text=strings[n.text_key]or n.text end;for _,c in ipairs(n.children or{})do visit(c)end end
visit(template);add('room_encyclopedia_image_thumb_locked_');add('room_encyclopedia_button_thumb_selected_0001')
local mapHud=expand(dofile(root..'group_map_hud_desktop.lua'))
local function find(n,path)path=path or{};path[#path+1]={id=n.id,pos=n.pos,scale=n.scale,anchor=n.anchor};if n.id and n.id:find('encyclopedia')then return n,path end;for _,c in ipairs(n.children or{})do local a,b=find(c,table.deepclone(path));if a then return a,b end end end
local mapButton,mapButtonPath=find(mapHud);if mapButton then visit(mapButton)end
local stagePrograms={}
for stage=1,3 do stagePrograms[stage]='';for _,mode in ipairs({'campaign','iron'})do local f=assert(io.open(string.format('public/data/level%02d-%s.json',stage,mode)));stagePrograms[stage]=stagePrograms[stage]..f:read('*a');f:close()end end
local rows={}
for i,row in ipairs(gs.encyclopedia_enemies)do
 local e=E:create_entity(row.name);local notification=gui.notifications[row.name]or{};local number=e.info.enc_icon or tonumber((notification.image or''):match('(%d+)$'));local key=e.info.i18n_key or row.name:upper();local a=e.melee and e.melee.attacks[1]or{};local ok,info=pcall(e.info.fn,e);if not ok then info={}end
 local firstStage;for stage=1,3 do if stagePrograms[stage]:find('"'..row.name..'"',1,true)then firstStage=stage;break end end
 rows[#rows+1]={firstStage=firstStage,id=row.name,name=strings[key..'_NAME']or row.name,description=strings[key..'_DESCRIPTION']or'',special=strings[key..'_SPECIAL']or'',alwaysShown=row.always_shown or false,portrait=number and add(string.format('encyclopedia_creeps_%04d',number)),thumb=number and add(string.format('encyclopedia_enemies_thumb_%04d',number)),health=e.health.hp_max,armor=e.health.armor,magicArmor=e.health.magic_armor,speed=e.motion and e.motion.max_speed or 0,lives=e.enemy.lives_cost,damageMin=info.damage_min or a.damage_min or 0,damageMax=info.damage_max or a.damage_max or 0,flying=bit.band(e.vis.flags,F_FLYING)~=0}
end
local output={scale=.48,template=template,enemies=rows,images=images,mapButton=mapButton,mapButtonPath=mapButtonPath}
local f=assert(io.open('public/data/enemy-book.json','w'));f:write(J.encode(output));f:close()
local path='analysis/enemy-book-export-frames.json';f=assert(io.open(path,'w'));f:write(J.encode(frames));f:close();print(#rows..' native enemy book entries exported')

assert(os.execute('python3 scripts/export_gui_icons.py '..path)==0);os.remove(path)
