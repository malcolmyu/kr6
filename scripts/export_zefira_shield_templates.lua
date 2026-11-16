EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J=require('entity_db'),require('dkjson');local out={}
local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local o={};for k,x in pairs(v)do o[k]=clean(x)end;return o end
for _,n in ipairs({'aura_zefira_skill_b_check','aura_zefira_skill_b','mod_zefira_skill_b_slow'})do out[n]=clean(E:get_template(n))end
local f=assert(io.open('public/data/zefira-shield.json','w'));f:write(dofile('scripts/precise_json.lua')(out));f:close()
