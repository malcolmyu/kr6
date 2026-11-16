local json=require('dkjson')
os.execute('mkdir -p public/fonts')
os.execute('cp reference/apk/assets/kr6-phone/fonts/NotoSansCJKsc-Bold.otf public/fonts/')
os.execute('cp reference/apk/assets/kr6-phone/fonts/YIKES.ttf public/fonts/')
local atlas,textures,exos={},{},{}
for _,group in ipairs({'screen_splash','screen_main_menu_anim','screen_main_menu_bg','screen_main_menu'})do
 for name,frame in pairs(dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/'..group..'.lua'))do atlas[name]=frame;textures[frame.a_name]=true end
end
for _,name in ipairs({'SplashScreenAnimationDef','ScreenSlotsLogoDef','ScreenSlotsBGDef'})do
 exos[name]=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/'..name..'.exo3')
end
local files={};for name in pairs(textures)do files[#files+1]=name;os.execute('cp runtime/desktop_assets/kr6-phone/images/ipadhd/'..name..' public/assets/')end
local file=assert(io.open('public/data/opening.json','w'));file:write(json.encode({atlas=atlas,exos=exos,textures=files}));file:close()
