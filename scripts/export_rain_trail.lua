TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local art=require('dkjson').decode(assert(io.open('public/data/towers-art.json')):read('*a'))
local encode=dofile('scripts/precise_json.lua')
local config={template='ps_power_rain_of_fire',system=E:get_template('ps_power_rain_of_fire').particle_system,animation=art.animations.rain_of_fire_particle_action}
local f=assert(io.open('public/data/rain-trail.json','w'));f:write(encode(config));f:close()
