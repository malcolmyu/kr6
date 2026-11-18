-- Read original A/C/ultimate templates and scripts without changing web data.
EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db')
local function clean(v,seen)
 if type(v)=='function'or type(v)=='userdata'then return nil elseif type(v)~='table'then return v end
 seen=seen or{};if seen[v]then return nil end;seen[v]=true;local r={};for k,x in pairs(v)do r[k]=clean(x,seen)end;seen[v]=nil;return r
end
local out={}
for name,e in pairs(E.entities)do
 if name:match('culverine')and(name:match('skill_a')or name:match('skill_c')or name:match('ultimate')or name=='tower_culverine_lvl4')then
  out[name]=clean(e)
  for key,fn in pairs(e.main_script or{})do if type(fn)=='function'then local f=assert(io.open('analysis/function-bytecode/'..name..'_'..key..'.lua','wb'));f:write(string.dump(fn));f:close()end end
 end
end
local f=assert(io.open('analysis/culverine-advanced-templates.json','w'));f:write(dofile('scripts/precise_json.lua')(out));f:close()
local names={};for name in pairs(out)do names[#names+1]=name end;table.sort(names);for _,name in ipairs(names)do print(name)end
