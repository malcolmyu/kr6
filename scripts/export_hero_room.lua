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
local template=expand(dofile(root..'room_tower.lua'));local tooltip=expand(dofile(root..'template_upgrade_tooltip.lua'));local slot=expand(dofile(root..'button_equipped_tower_slot.lua'));local purchaseFx=expand(dofile(root..'group_select_fx_particles.lua'));local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua')
local atlas={};for _,name in ipairs({'room_tower','room_common','gui_common','screen_map_hud'})do for key,frame in pairs(dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/'..name..'.lua'))do atlas[key]=frame;for _,alias in ipairs(frame.alias or{})do atlas[alias]=frame end end end
local frames,images,missing={},{},{}
local mapHud=expand(dofile(root..'group_map_hud_desktop.lua'))
local function mapFind(n,path)path=path or {};path[#path+1]={id=n.id,pos=n.pos,scale=n.scale,anchor=n.anchor};if n.id=='button_map_heroes'then return n,path end;for _,c in ipairs(n.children or{})do local btn,p=mapFind(c,table.deepclone(path));if btn then return btn,p end end end
local mapButton,mapButtonPath=mapFind(mapHud)
local function add(name)if not name or name:match('^hero_skill_tree_main_icon_')then return end;local f=atlas[name];if not f then missing[name]=true;return end;frames[name]=f;images[name]={x=f.size[1]/2,y=f.size[2]/2}end
local function visit(n)
 if n.animation and n.animation.prefix then for index=n.animation.from or 1,n.animation.to or 1 do local name=n.animation.prefix..'_'..string.format('%04d',index);if atlas[name]then add(name)end end end
 for _,key in ipairs({'image_name','default_image_name','focus_image_name','false_image_name','true_image_name','disabled_image_name'})do add(n[key])end
 if n.text_key then n.text=strings[n.text_key]or n.text end
 for _,c in ipairs(n.children or{})do visit(c)end
end
visit(template)
visit(tooltip)
visit(slot)
visit(purchaseFx)
if mapButton then visit(mapButton)end
local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua');local labels={}
for _,hero in ipairs({'hero_gerald','hero_zefira','hero_bolin'})do labels[hero]={};for id,node in pairs(data.data_upgrades[hero])do if type(node)=='table'then add(node.img);if node.img and atlas[node.img..'_disabled']then add(node.img..'_disabled')end;labels[hero][id]={title=strings[node.title_key],description=strings[node.description_key]}end end end
for _,hero in ipairs({'hero_gerald','hero_zefira','hero_bolin'})do add('hero_portraits_big_'..hero);add('hero_portraits_small_'..hero)end
for _,hero in ipairs(data.hero_order_free)do add('icon_room_'..hero)end
for name in pairs(missing)do print('Missing image '..name)end
local out={purchaseFx=purchaseFx,slot=slot,heroOrder=data.hero_order_free,scale=require('screen_utils').get_default_base_scale(ctx.sw,ctx.sh).x,tooltip=tooltip,mapButton=mapButton,mapButtonPath=mapButtonPath,template=template,images=images,labels=labels,width=ctx.sw,height=ctx.sh}
local f=assert(io.open('public/data/hero-room.json','w'));f:write(J.encode(out));f:close()
f=assert(io.open('analysis/power-icons.json','w'));f:write(J.encode(frames));f:close();assert(os.execute('python3 scripts/export_gui_icons.py')==0)
print('Expanded desktop room with original images and strings')
