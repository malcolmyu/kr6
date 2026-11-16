EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua');require('klove.kui')
local V,J=require('klua.vector'),require('dkjson');local fit=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line2522.lua'));local rows={}
for i=1,10 do local name=debug.getupvalue(fit,i);if not name then break end;assert(name=='V',name);debug.setupvalue(fit,i,V)end
for _,size in ipairs({{1365.3333333333,768},{1365.3333333333,1228.8},{1920,768},{1024,768}})do for _,scale in ipairs({.48,.6})do
 local window,center,parent,overlay=KWindow:new(V.v(size[1],size[2])),KView:new(),KView:new(),KView:new()
 center.pos=V.v(size[1]/2,size[2]/2);center.scale=V.v(scale,scale);parent.pos=V.v(0,40);window:add_child(center);center:add_child(parent);parent:add_child(overlay)
 fit({},overlay);rows[#rows+1]={width=size[1],height=size[2],scale=scale,pos=overlay.pos,size=overlay.size,anchor=overlay.anchor,overlayScale=overlay.scale}
end end
local f=assert(io.open('analysis/power-room-fit-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original KView window-to-parent overlay fits exported')
