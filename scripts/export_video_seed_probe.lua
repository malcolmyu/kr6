-- Controlled alternate RNG in the original engine, without rewriting a
-- canonical runtime fixture or changing production defaults/balance.
local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local seed=assert(tonumber(arg[11]),'Pass controlled seed as argument11')
if arg[12]=='fresh-iron'then local a,b=source:find("main.params.skip_cutscenes=variant=='skip-cutscenes'",1,true);assert(a);source=source:sub(1,a-1).."slot.levels[stage][3]=nil\n"..source:sub(a)end
local first,last=source:find('local seed=104',1,true);assert(first);source=source:sub(1,first-1)..'local seed='..seed..source:sub(last+1)
first=assert(source:find('local function snapshotRuntime()',1,true));last=assert(source:find("phase='flush';sim:do_tick()",first,true))
source=source:sub(1,first-1)..[[local samples={}
local function snapshotRuntime()
 if store.tick==1875 or store.tick==1905 or store.tick==1995 or store.tick==2055 then samples[#samples+1]={tick=store.tick,gold=store.player_gold,draws=#randomDraws}end
end
]]..source:sub(last)
first=assert(source:find('local queueOnlyFlush=',1,true))
source=source:sub(1,first-1)..[[
local result={note='Original APK engine, controlled alternate LCG; not identified video RNG',seed=tonumber(arg[11]),config={guardHp=E:get_template('soldier_knights_lvl1').health.hp_max,wizardMin=E:get_template('bolt_tower_wizard_lvl1').bullet.damage_min,catapultMin=E:get_template('bullet_catapult_lvl1').bullet.damage_min},playerLevel=store.player_level,difficulty=store.level_difficulty,samples=samples,resources={missing=runtimeResources.missing,missingAnimations=runtimeResources.A.missing_animations}}
local output=assert(io.open('analysis/video-opening-native-seed-'..arg[11]..(arg[12]and'-'..arg[12]or'')..'.json','w'));output:write(J.encode(result));output:close();print(J.encode(result))
]]
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
