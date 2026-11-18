EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db')
local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local r={};for k,x in pairs(v)do r[k]=clean(x)end;return r end
local mods={}
for i=1,3 do local name='mod_bullet_culverine_skill_b_lvl'..i;local e=assert(E:create_entity(name));mods[name]=clean(e)
 for k,fn in pairs(e.main_script or{})do if type(fn)=='function'then local f=assert(io.open('analysis/function-bytecode/'..name..'_'..k..'.lua','wb'));f:write(string.dump(fn));f:close()end end
end
local f=assert(io.open('analysis/culverine-skill-b-templates.json','w'));f:write(dofile('scripts/precise_json.lua')(mods));f:close()
