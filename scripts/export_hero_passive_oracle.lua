EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local UP=require('upgrades');local J=require('dkjson');local _,patch=debug.getupvalue(UP.patch_templates,6)
local selected={hero_gerald={'skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e'},hero_zefira={'skill_a','skill_b','skill_c','upg_a','upg_c','upg_d','upg_e'}}
UP:set_levels(selected);patch(UP,{})
local rows={}
for _,name in ipairs({'hero_gerald','hero_zefira'})do for level=1,10 do
 local h=E:create_entity(name);h.hero.level=level;h.hero.fn_level_up(h,{},true)
 local attacks={};for _,a in ipairs(h.melee.attacks)do attacks[#attacks+1]={min=a.damage_min,max=a.damage_max,xp=a.xp_gain_factor}end
 rows[#rows+1]={name=name,nodes=selected[name],level=level,hp=h.health.hp_max,armor=h.health.armor,respawn=h.health.dead_lifetime,regen=h.regen.health,attacks=attacks}
end end
local f=assert(io.open('analysis/hero-passives-oracle.json','w'));f:write(J.encode(rows));f:close()
