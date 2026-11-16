EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J=require('dkjson');local V=require('klua.vector');local log=require('klua.log'):new('nine-slice-oracle');local data=J.decode(assert(io.open('public/data/hero-room.json')):read('*a'))
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/kviews_gg_sequels.lua 599')==0)
local samples={};local function visit(n)if n.slice_rect and n.image_name then samples[#samples+1]=n end;for _,c in ipairs(n.children or{})do visit(c)end end;visit(data.template);visit(data.tooltip)
local cases={}
for _,n in ipairs(samples)do for _,variant in ipairs({'normal','small','overdraw'})do
 local imageSize=data.images[n.image_name];local size=variant=='small'and{x=15,y=10}or n.size or imageSize
 local rows,canvasCount,current={},0,nil;local tx,ty=0,0;local stack={};local G={}
 G.getColor=function()return 255,255,255,255 end;G.getScissor=function()return nil,nil,nil,nil end
 for _,k in ipairs({'setColor','setScissor','clear','setBlendMode'})do G[k]=function()end end
 G.newCanvas=function(w,h)canvasCount=canvasCount+1;return{id=canvasCount,getDimensions=function()return w,h end}end
 G.setCanvas=function(c)current=c end;G.push=function()stack[#stack+1]={tx,ty}end;G.pop=function()local t=table.remove(stack);tx,ty=t[1],t[2]end;G.origin=function()tx,ty=0,0 end;G.translate=function(x,y)tx,ty=tx+x,ty+y end
 G.newQuad=function(x,y,w,h)return{x,y,w,h}end
 G.draw=function(image,q,x,y,rotation,sx,sy)if current and current.id==2 then rows[#rows+1]={source=q,destination={tx+x,ty+y,q[3]*sx,q[4]*sy}}end end
 local I={s=function()return{size={imageSize.x*2,imageSize.y*2},ref_scale=.5,trim={0,0},atlas='atlas'}end,i=function()return{}end}
 local fn=assert(loadfile('analysis/function-bytecode/kviews_gg_sequels_line599.lua'))
 for i=1,99 do local name=debug.getupvalue(fn,i);if not name then break end;local value=({I=I,G=G,V=V,log=log})[name];assert(value,name);debug.setupvalue(fn,i,value)end
 local self={image_name=n.image_name,slice_rect=n.slice_rect,overdraw_sides=variant=='overdraw',size=size,anchor_factor={x=.5,y=.5},set_image=function()end}
 fn(self)
 cases[#cases+1]={image=imageSize,size=size,slice=n.slice_rect,overdraw=variant=='overdraw',rows=rows,anchor=self.anchor}
end end
local f=assert(io.open('analysis/nine-slice-oracle.json','w'));f:write(J.encode(cases));f:close();print(#cases..' native nine-slice drawing cases')
