TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local out={}
local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local t={};for k,x in pairs(v)do t[k]=clean(x)end;return t end
for _,name in ipairs({'mod_zefira_skill_a_stun','decal_zefira_skill_a_hit'})do out[name]=clean(E:get_template(name))end
out.attack=clean(E:get_template('hero_zefira').melee.attacks[2])
local f=assert(io.open('public/data/zefira-hammer.json','w'));f:write(dofile('scripts/precise_json.lua')(out));f:close()
