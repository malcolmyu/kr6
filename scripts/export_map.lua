local J=require('dkjson');local V=require('klua.vector');v=V.v;r=V.r
local atlas=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/screen_map.lua')
local flags=dofile('reference/apk/assets/gc64/kr6/data/kui_templates/group_map_flags.lua')
local flag=dofile('reference/apk/assets/gc64/kr6/data/kui_templates/button_map_stage_flag.lua')
local out={width=2486,height=1339.5,flags={},template=flag,images={}}
local frames={}
local function add(name)
 local f=atlas[name]
 if not f then for _,frame in pairs(atlas)do for _,a in ipairs(frame.alias or {})do if a==name then f=frame end end end end
 assert(f,name);frames[name]=f;out.images[name]={x=f.size[1]/2,y=f.size[2]/2}
end
for _,n in ipairs(flags.children)do if tonumber(n.id:match('%d+'))<=3 then out.flags[#out.flags+1]={level=tonumber(n.id:match('%d+')),pos=n.pos}end end
for i=1,221 do add(string.format('kr6_map_flags_animation_stage_flag_%04d',i))end
for star=1,3 do for i=1,22 do add(string.format('kr6_map_flags_animation_stage_flag_star_%d_%04d',star,i))end end
for _,name in ipairs({'kr6_map_flags_image_flag_highlight_0001','kr6_map_flags_image_flag_highlight_0003'})do add(name)end
assert(os.execute('cp runtime/desktop_assets/kr6-phone/images/ipadhd/screen_map_bg-1.png public/assets/')==0)
assert(os.execute('cp runtime/desktop_assets/kr6-phone/images/ipadhd/screen_map_bg-2.png public/assets/')==0)
local f=assert(io.open('analysis/power-icons.json','w'));f:write(assert(J.encode(frames)));f:close();assert(os.execute('python3 scripts/export_gui_icons.py')==0)
f=assert(io.open('public/data/map.json','w'));f:write(assert(J.encode(out)));f:close()
