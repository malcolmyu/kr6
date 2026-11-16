EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J,V=require('dkjson'),require('klua.vector');local km=require('klua.macros');v=V.v;r=V.r
local oldCtx,oldMobile,oldDesktop=ctx,IS_MOBILE,IS_DESKTOP
IS_MOBILE=true;IS_DESKTOP=false;ctx={sw=1024,sh=768,bs={x=1,y=1},safe_frame={l=0,r=1024,t=0,b=768},is_mobile=true,is_desktop=false,OVT=function(a)return a end}
local layout=dofile('reference/apk/assets/gc64/kr6/data/kui_templates/loading_screen.lua')
local indicator;for _,n in ipairs(layout.children)do if n.id=='loading_indicator'then indicator=n end end;assert(indicator)
local atlas=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/loading_common.lua');local frames,images,textures={},{},{}
for name,frame in pairs(atlas)do textures[frame.a_name]=true;frames[name]=frame;for _,a in ipairs(frame.alias or{})do images[a]={x=frame.size[1]/2,y=frame.size[2]/2}end;images[name]={x=frame.size[1]/2,y=frame.size[2]/2}end
local exo=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/loadingDef.exo3');local files={};for name in pairs(textures)do files[#files+1]=name;assert(os.execute('cp runtime/desktop_assets/kr6-phone/images/ipadhd/'..name..' public/assets/')==0)end
local out={atlas=atlas,exo=exo,textures=files,indicator=indicator,images=images,refWidth=1024,refHeight=768}
local f=assert(io.open('public/data/scene-transition.json','w'));f:write(J.encode(out));f:close()
local icons={};for _,n in ipairs(indicator.children)do for _,key in pairs({n.image_name,n.children and n.children[1].image_name})do if key then for name,frame in pairs(atlas)do if name==key or table.contains(frame.alias,key)then icons[key]=frame;break end end end end end
f=assert(io.open('analysis/power-icons.json','w'));f:write(J.encode(icons));f:close();assert(os.execute('python3 scripts/export_gui_icons.py')==0)
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_loading_game.lua 31 65 88 97 107')==0)
local funcs={};for _,line in ipairs({31,65,88,97,107})do local fn=assert(loadfile('analysis/function-bytecode/kviews_screen_loading_game_line'..line..'.lua'));for i=1,10 do local n=debug.getupvalue(fn,i);if not n then break end;local value=({V=V,km=km})[n];assert(value,n);debug.setupvalue(fn,i,value)end;funcs[line]=fn end
local rows={}
for _,scale in ipairs({.75,1,4/3,2})do for _,debugAlign in ipairs({false,true})do for _,p in ipairs({-.2,0,.05,.1,.5,1,1.5})do
 local nodes={};for _,n in ipairs(indicator.children)do local o=table.deepclone(n);o.size=o.size or table.deepclone(images[o.image_name]);o.scale={x=1,y=1};o.anchor=o.anchor or{x=0,y=0};o.alpha=1;o.hidden=not not o.hidden;if o.children then local child=o.children[1];child=table.deepclone(child);child.size=table.deepclone(images[child.image_name]);child.pos=child.pos or{x=0,y=0};child.scale={x=1,y=1};child.hidden=false;child.alpha=1;function o:ci()return child end end;nodes[o.id]=o end
 local self={fill_max=indicator.fill_max,shine_fade_in=indicator.shine_fade_in,align_debug=debugAlign,ci=function(_,id)return nodes[id]end,set_fill=funcs[65]}
 funcs[31](self,scale);funcs[97](self,p);local before=table.deepclone(self.parts.clip.pos)
 funcs[88](self);funcs[97](self,p)
 local function snap()local out={revealed=self.revealed};for _,k in ipairs({'off','clip','on','shine','mask'})do local n=self.parts[k];out[k]={pos=table.deepclone(n.pos),size=table.deepclone(n.size),anchor=n.anchor and table.deepclone(n.anchor),scale=n.scale and table.deepclone(n.scale),alpha=n.alpha,hidden=n.hidden}end;return out end
 local filled=snap();funcs[107](self);rows[#rows+1]={scale=scale,debug=debugAlign,progress=p,before=before,filled=filled,opening=snap()}
end end end
f=assert(io.open('analysis/loading-sword-oracle.json','w'));f:write(J.encode(rows));f:close();print('Native KR6 loading EXO and56 original sword fill/reveal/opening cases exported')
ctx,IS_MOBILE,IS_DESKTOP=oldCtx,oldMobile,oldDesktop
