-- Preserve every top-level field and every complete native frame, without
-- building dkjson's one enormous fragment table for the entire battle.
local J=require('dkjson')
return function(path,value)
 local f=assert(io.open(path,'w'));f:write('{');local comma=false
 for key,item in pairs(value)do
  assert(type(key)=='string','native trace root must be an object')
  if comma then f:write(',')end;comma=true;f:write(assert(J.encode(key)),':')
  if key=='frames'then
   f:write('[')
   for i,frame in ipairs(item)do if i>1 then f:write(',')end;f:write(assert(J.encode(frame)))end
   f:write(']')
  else f:write(assert(J.encode(item)))end
 end
 f:write('}');f:close()
end
