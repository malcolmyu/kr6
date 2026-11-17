EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson')
local names={'tower_knights_lvl4','soldier_knights_lvl4'}
for name in pairs(E.entities)do if name:match('^aura_knights_skill')or name:match('^mod_knights_skill')or name:match('^fx_knights_skill')then names[#names+1]=name end end
table.sort(names)
local out={}
local function clean(v)if type(v)=='function'or type(v)=='userdata'then return nil elseif type(v)~='table'then return v end;local t={};for k,x in pairs(v)do t[k]=clean(x)end;return t end
for _,name in ipairs(names)do
 local e=E:create_entity(name);out[name]=clean(e)
 for key,fn in pairs(e.main_script or{})do if type(fn)=='function'then local f=assert(io.open('analysis/function-bytecode/'..name..'_'..key..'.lua','wb'));f:write(string.dump(fn));f:close()end end
end
local f=assert(io.open('analysis/knight-skill-templates.json','w'));f:write(dofile('scripts/precise_json.lua')(out));f:close();print('Original knight templates '..#names)
for name,fn in pairs({soldier_power_upgrade=require('script_utils').soldier_power_upgrade,is_inside_ellipse=require('utils').is_inside_ellipse})do local f=assert(io.open('analysis/function-bytecode/knight_'..name..'.lua','wb'));f:write(string.dump(fn));f:close()end

local U,SU=require('utils'),require('script_utils')
local helpers={y_wait=U.y_wait,y_soldier_wait=SU.y_soldier_wait,y_soldier_death=SU.y_soldier_death,attack_order=U.attack_order}
for i=1,10 do local n,v=debug.getupvalue(SU.y_soldier_wait,i);if n=='soldier_interrupted'then helpers.soldier_interrupted=v end end
for name,fn in pairs(helpers)do local f=assert(io.open('analysis/function-bytecode/knight_'..name..'.lua','wb'));f:write(string.dump(fn));f:close()end

local chance=E:create_entity('mod_knights_skill_c_stun_lvl1').main_script.insert
for i=1,12 do local n,v=debug.getupvalue(chance,i);if n=='scripts'then local f=assert(io.open('analysis/function-bytecode/knight_mod_stun_insert.lua','wb'));f:write(string.dump(v.mod_stun.insert));f:close()end end
