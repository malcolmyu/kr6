EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local art=require('dkjson').decode(assert(io.open('public/data/towers-art.json')):read('*a'));local name='ps_bullet_bolin_casing';local config={template=name,system=E:get_template(name).particle_system,landAnimation=art.animations.bolin_casing_animations_land,animation=art.animations.bolin_casing_trail_animations_trail};assert(config.animation)
local f=assert(io.open('public/data/bolin-casing-trail.json','w'));f:write(dofile('scripts/precise_json.lua')(config));f:close()
