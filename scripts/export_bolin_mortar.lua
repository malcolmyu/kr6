EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local art=require('dkjson').decode(assert(io.open('public/data/towers-art.json')):read('*a'));local ps=E:get_template('ps_bullet_bolin_skill_a').particle_system
local frames={};for _,a in ipairs(art.exos.bolin_mortar_smokeDef.animations)do frames[a.name]=#a.frames end
local bullet=E:get_template('bullet_bolin_skill_a').bullet
local f=assert(io.open('public/data/bolin-mortar.json','w'));f:write(dofile('scripts/precise_json.lua')({flyingFlag=F_FLYING,landOrIce=bit.bor(TERRAIN_LAND,TERRAIN_ICE),noWalk=TERRAIN_NOWALK,height=bullet.fixed_height,gravity=bullet.g,system=ps,animation=art.animations.bolin_mortar_trail_animations_trail,smokeFrames=frames,bulletExitFrames=art.animations.bolin_mortar_animations_explode.to-art.animations.bolin_mortar_animations_explode.from+1}));f:close()
