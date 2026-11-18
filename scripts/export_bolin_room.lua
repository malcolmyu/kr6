-- Keep all staging in analysis: do not write production JSON or crop public PNGs.
local f=assert(io.open('scripts/export_hero_room.lua'));local source=f:read('*a');f:close()
local n;source,n=source:gsub("{'hero_gerald','hero_zefira','hero_bolin'}","{'hero_bolin'}");assert(n==2)
source=source:gsub('public/data/hero%-room.json','analysis/bolin-hero-room.json')
local at=assert(source:find("f=assert(io.open('analysis/power-icons.json'",1,true));source=source:sub(1,at-1)..[[local f=assert(io.open('analysis/bolin-room-images.json','w'));f:write(J.encode(frames));f:close()]]
assert(loadstring(source,'@scripts/export_hero_room.lua'))()
f=assert(io.open('scripts/export_hero_room_state.lua'));source=f:read('*a');f:close()
local before="local outputPath='public/data/'..menu..'-room.json'";local first,last=assert(source:find(before,1,true));source=source:sub(1,first-1).."local outputPath='analysis/bolin-hero-room.json'"..source:sub(last+1)
source,n=source:gsub("{'hero_gerald','hero_zefira','hero_bolin'}","{'hero_bolin'}");assert(n==1)
assert(loadstring(source,'@scripts/export_hero_room_state.lua'))()
