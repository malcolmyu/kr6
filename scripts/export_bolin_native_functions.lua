-- Read-only extraction for the hero reward reachable at11 stars in full/IAP
-- progression. Keep these references separate from runtime web data.
EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local selected={}
for name in pairs(E.entities)do if name:find('bolin',1,true)then selected[name]=true end end
local function refs(v,seen)
 if type(v)=='string'then if E.entities[v]then selected[v]=true end;return end
 if type(v)~='table'then return end;seen=seen or{};if seen[v]then return end;seen[v]=true;for _,x in pairs(v)do refs(x,seen)end
end
for pass=1,4 do local names={};for n in pairs(selected)do names[#names+1]=n end;for _,n in ipairs(names)do refs(E.entities[n])end end
local function clean(v,seen)
 if type(v)=='function'or type(v)=='userdata'then return nil elseif type(v)~='table'then return v end
 seen=seen or{};if seen[v]then return nil end;seen[v]=true;local t={};for k,x in pairs(v)do t[k]=clean(x,seen)end;seen[v]=nil;return t
end
local out,functions={},{}
for name in pairs(selected)do
 local e=E.entities[name];out[name]=clean(e)
 for key,fn in pairs(e.main_script or{})do if type(fn)=='function'then
  local path='analysis/function-bytecode/bolin_'..name..'_'..key..'.lua';local f=assert(io.open(path,'wb'));f:write(string.dump(fn));f:close()
  local info=debug.getinfo(fn,'S');functions[#functions+1]={template=name,method=key,source=info.source,line=info.linedefined,last=info.lastlinedefined}
 end end
end
local encode=dofile('scripts/precise_json.lua');local f=assert(io.open('analysis/bolin-native-templates.json','w'));f:write(encode(out));f:close();f=assert(io.open('analysis/bolin-native-functions.json','w'));f:write(encode(functions));f:close()
local count=0;for _ in pairs(out)do count=count+1 end;print(count..' original Bolin/dependency templates and '..#functions..' original main callbacks extracted without changing web assets')
