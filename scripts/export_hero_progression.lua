EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local GS=require('game_settings');local J=require('dkjson');local E=require('entity_db')
local rules={}
for _,k in ipairs({'use_player_level','hero_xp_thresholds','hero_level_expected','hero_level_expected_multipliers_above','hero_level_expected_multipliers_below','hero_xp_multipliers_per_mode','hero_xp_gain_per_difficulty_mode'})do rules[k]=GS[k] end
local f=assert(io.open('public/data/hero-progression.json','w'));f:write(J.encode(rules));f:close()
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/script_utils.lua 680')==0)
local fn=assert(loadfile('analysis/function-bytecode/script_utils_line680.lua'))
local km;for i=1,20 do local n,v=debug.getupvalue(require('script_utils').hero_level_up,i);if n=='km' then km=v end end
local events={};local bindings={GS=GS,km=km,log_xp={debug=function()end},signal={emit=function(name)events[#events+1]=name end},S={queue=function(_,name)events[#events+1]=name end}}
for i=1,20 do local n=debug.getupvalue(fn,i);if not n then break end;assert(bindings[n],n);debug.setupvalue(fn,i,bindings[n])end
local rows={}
for stage=1,3 do for mode=1,3 do for playerLevel=0,3 do for _,input in ipairs({{1,0,.49},{1,0,.5},{1,995,10},{2,1000,9.5},{3,4000,17.5},{4,8500,17.5},{10,72000,100}})do
 local h={level=input[1],xp=input[2],xp_queued=input[3],fn_level_up=function(this)events[#events+1]='stats';this.health.hp=999 end}
 local this={hero=h,health={hp=10},id=1,template_name='hero_gerald'};events={}
 local changed=fn({level_idx=stage,player_level=playerLevel,level_mode=mode,level_difficulty=2},this)
 rows[#rows+1]={stage=stage,playerLevel=playerLevel,mode=mode,input=input,xp=h.xp,queued=h.xp_queued,level=h.level,changed=changed,events=events}
 end end end end
f=assert(io.open('analysis/hero-progression-oracle.json','w'));f:write(J.encode(rows));f:close()

local stats={}
for _,name in ipairs({'hero_gerald','hero_zefira'})do for level=1,10 do
 local e=E:create_entity(name);e.hero.level=level;e.hero.fn_level_up(e,{},true)
 local row={name=name,level=level,hp=e.health.hp_max,armor=e.health.armor,regen=e.regen.health,melee={e.melee.attacks[1].damage_min,e.melee.attacks[1].damage_max}}
 if e.ranged then local b=E:get_template(e.ranged.attacks[1].bullet).bullet;row.ranged={b.damage_min,b.damage_max}end
 stats[#stats+1]=row
end end
f=assert(io.open('analysis/hero-stats-oracle.json','w'));f:write(J.encode(stats));f:close()
