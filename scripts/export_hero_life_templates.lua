TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J=require('entity_db'),require('dkjson');local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local rows={}
for _,name in ipairs({'hero_gerald','hero_zefira'})do local h=E:create_entity(name);local he=h.hero;local frames={};for _,a in ipairs(art.exos[h.render.sprites[1].prefix].animations)do frames[a.name]=#a.frames end
 rows[name]={deathAnimation=h.unit.death_animation or'death',respawnAnimation=he.respawn_animation or'respawn',frames=frames,tombstone=he.tombstone_show_time and{showTime=he.tombstone_show_time,concurrent=he.tombstone_concurrent_with_death or false,name=he.tombstone_decal,sprite=E:get_template(he.tombstone_decal).render.sprites[1],tween=E:get_template(he.tombstone_decal).tween},sound=h.sound_events,flags={eat=DAMAGE_EAT,host=DAMAGE_HOST,disintegrate=DAMAGE_DISINTEGRATE_BOSS}}
end
local f=assert(io.open('public/data/hero-life-runtime.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print('Original hero life config and EXO frame counts exported')
