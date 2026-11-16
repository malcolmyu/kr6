EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local t={};for k,x in pairs(v)do t[k]=clean(x)end;return t end
local h=E:get_template('hero_gerald');local exo=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/go_hero_gerald/hero_geraldDef.exo3');local frames
for _,a in ipairs(exo.animations)do if a.name=='fated_survivor'then frames=#a.frames end end;assert(frames)
local out={attack=clean(h.timed_attacks.list[3]),skill=clean(h.hero.skills.skill_c),frames=frames,teleport=clean(E:get_template('mod_gerald_skill_c_teleport'))}
local f=assert(io.open('public/data/gerald-survivor-runtime.json','w'));f:write(dofile('scripts/precise_json.lua')(out));f:close()
