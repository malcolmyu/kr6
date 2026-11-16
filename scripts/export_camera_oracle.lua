EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local fn=assert(loadfile('analysis/function-bytecode/game_line176.lua'))
for index=1,20 do
  local name=debug.getupvalue(fn,index)
  if not name then break end
  if name=='km' then debug.setupvalue(fn,index,require('klua.macros'))
  elseif name=='ingame_fit_zoom_ui' then debug.setupvalue(fn,index,false) end
end
local cases={}
for _,width in ipairs({1400,768*16/9}) do
for _,zoom in ipairs({.5,1,1.2,1.75,2,3}) do
  for _,x in ipairs({-200,142,512,829,1400}) do
    for _,y in ipairs({-100,319,1000}) do
      local camera={zoom=zoom,x=x,y=768-y,min_zoom=width/(768*16/9),min_zoom_clamp=width/(768*16/9),max_zoom=width/(768*14/9)+.7,ww=768*16/9,wh=768,wl=-512/3,wr=1024+512/3,wt=0,wb=768}
      fn(camera)
      cases[#cases+1]={width=width,input={x=x,y=y,zoom=zoom},expected={x=camera.x,y=768-camera.y,zoom=camera.zoom}}
    end
  end
end
end
local f=assert(io.open('analysis/camera-oracle.json','w'));f:write(assert(require('dkjson').encode(cases)));f:close()
