EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local art=require('dkjson').decode(assert(io.open('public/data/towers-art.json')):read('*a'))
local p=E:get_template('ps_culverine_skill_a').particle_system
local config={template='ps_culverine_skill_a',system=p,animation=art.animations[p.name]}
local f=assert(io.open('public/data/culverine-sulfur-trail.json','w'));f:write(dofile('scripts/precise_json.lua')(config));f:close()
