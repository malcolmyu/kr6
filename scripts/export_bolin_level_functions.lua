EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local rows={};local seen={}
local function walk(v,path)
 if type(v)=='function'then
  local info=debug.getinfo(v,'S');local file='analysis/function-bytecode/bolin_'..path:gsub('[^%w]','_')..'.lua';local f=assert(io.open(file,'wb'));f:write(string.dump(v));f:close();local upvalues={};for i=1,50 do local name=debug.getupvalue(v,i);if not name then break end;upvalues[#upvalues+1]=name end
  rows[#rows+1]={path=path,file=file,source=info.source,line=info.linedefined,last=info.lastlinedefined,upvalues=upvalues};return
 end
 if type(v)~='table'or seen[v]then return end;seen[v]=true;for k,x in pairs(v)do walk(x,path..'_'..tostring(k))end
end
walk(E.entities.hero_bolin,'hero_bolin')
local encode=dofile('scripts/precise_json.lua');local f=assert(io.open('analysis/bolin-hero-function-map.json','w'));f:write(encode(rows));f:close();print(#rows..' original Bolin hero callbacks and level functions extracted read-only')
