EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J=require('dkjson')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/kviews_gg.lua 1206')==0)
local fn=assert(loadfile('analysis/function-bytecode/kviews_gg_line1206.lua'))
local opening=J.decode(assert(io.open('public/data/opening.json')):read('*a'))
local transition=J.decode(assert(io.open('public/data/scene-transition.json')):read('*a'));for name,entry in pairs(transition.atlas)do opening.atlas[name]=entry end;opening.exos.loadingDef=transition.exo
local calls={};local batch={clear=function()end,setTexture=function()end,setColor=function()end,add=function(_,quad,x,y,r,sx,sy,ox,oy,kx,ky)calls[#calls+1]={name=quad,x=x,y=y,r=r,sx=sx,sy=sy,ox=ox,oy=oy,kx=kx,ky=ky}end}
local I={s=function(_,name)local f=opening.atlas[name];if not f then for _,entry in pairs(opening.atlas)do if table.contains(entry.alias or{},name)then f=entry;break end end end;assert(f,name);return {quad=name,atlas=f.a_name,ref_scale=.5,size=f.size,trim=f.trim}end,i=function(_,name)return name end}
local bindings={G={draw=function()end},I=I,EXO={},log={warning=function()end}}
for i=1,20 do local n=debug.getupvalue(fn,i);if not n then break end;assert(bindings[n],n);debug.setupvalue(fn,i,bindings[n])end
local oldNative=KR_NATIVE;KR_NATIVE=false
local rows={}
for _,name in ipairs({'ScreenSlotsBGDef','ScreenSlotsLogoDef','SplashScreenAnimationDef','loadingDef'})do
 local exo=opening.exos[name]
 for _,ani in ipairs(exo.animations)do local indices={1,#ani.frames};if name=='loadingDef'then indices={};for i=1,#ani.frames do indices[#indices+1]=i end end;for _,index in ipairs(indices)do
  calls={};local frame=ani.frames[index];frame.exo=exo
  fn({_exo_frame=frame,batch=batch,colors={},alpha=1,r=0,exo_name=name})
  rows[#rows+1]={name=name,animation=ani.name,frame=index,commands=calls}
 end end
end
KR_NATIVE=oldNative
local f=assert(io.open('analysis/ui-exo-draw-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original GGExo drawing transforms exported for all opening animation endpoints')
