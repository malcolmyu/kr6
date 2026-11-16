TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local out={}
local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local t={};for k,x in pairs(v)do t[k]=clean(x)end;return t end
out.attack=clean(E:get_template('enemy_shadow_archer').ranged.attacks[1]);out.bullet=clean(E:get_template('bullet_shadow_archer').bullet)
local f=assert(io.open('public/data/enemy-ranged-runtime.json','w'));f:write(dofile('scripts/precise_json.lua')(out));f:close()
