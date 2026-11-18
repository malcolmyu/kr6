EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,UP=require('entity_db'),require('upgrades');local _,patch=debug.getupvalue(UP.patch_templates,6)
local f=assert(io.open('analysis/function-bytecode/bolin_upgrade_patch.lua','wb'));f:write(string.dump(patch));f:close()
local function clean(v,seen)if type(v)=='function'or type(v)=='userdata'then return nil elseif type(v)~='table'then return v end;seen=seen or{};if seen[v]then return nil end;seen[v]=true;local r={};for k,x in pairs(v)do r[k]=clean(x,seen)end;seen[v]=nil;return r end
local base={};for name,t in pairs(E.entities)do if name:find('bolin',1,true)then base[name]=table.deepclone(t)end end
local cases={{},{'upg_a'},{'upg_b'},{'upg_c'},{'upg_d'},{'upg_e'},{'upg_a','upg_b','upg_c','upg_d','upg_e'},{'skill_a','upg_sa1','upg_sa2'},{'skill_b','upg_sb1','upg_sb2'},{'skill_c','upg_sc1','upg_sc2'},{'talent_1'},{'talent_2'},{'ulti'},{'skill_a'},{'skill_a','upg_sa1'},{'skill_b'},{'skill_b','upg_sb1'},{'skill_c'},{'skill_c','upg_sc1'}}
local out={}
for _,nodes in ipairs(cases)do
 for name,t in pairs(base)do E.entities[name]=table.deepclone(t)end
 UP:set_levels({hero_bolin=nodes});patch(UP,{})
 local row={nodes=nodes,hero=clean(E.entities.hero_bolin),levels={}}
 for level=1,10 do local h=E:create_entity('hero_bolin');h.hero.level=level;h.hero.fn_level_up(h,{},true);row.levels[#row.levels+1]={level=level,hp=h.health.hp_max,armor=h.health.armor,regen=h.regen.health,melee=clean(h.melee.attacks[1]),bullet=clean(E.entities.bullet_bolin.bullet),skillC=clean(E.entities.bullet_bolin_skill_c.bullet),ultimate=clean(E.entities.bullet_bolin_ultimate.bullet)}end
 out[#out+1]=row
end
local encode=dofile('scripts/precise_json.lua');f=assert(io.open('analysis/bolin-passives-oracle.json','w'));f:write(encode(out));f:close();print(#out..' original Bolin upgrade configurations / '..#out*10 ..' levels')
