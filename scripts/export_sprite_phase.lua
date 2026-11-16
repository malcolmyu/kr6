TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local S,J=require('systems'),require('dkjson');local rows={}
for _,range in ipairs({false,0,.5,1,2.3})do for _,roll in ipairs({0,.25,.5,.999})do
 local calls=0;math.random=function()calls=calls+1;return roll end
 local sprite={ts=1.25};if range~=false then sprite.random_ts=range end
 local entity={id=1,render={frames={},sprites={sprite}}}
 S.render:on_insert(entity,{render_frames={}})
 rows[#rows+1]={range=range,roll=roll,ts=sprite.ts,calls=calls}
end end
local f=assert(io.open('analysis/sprite-phase-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original render insertion random timestamp/draw cases exported')
