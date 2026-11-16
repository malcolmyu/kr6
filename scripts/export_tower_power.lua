EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J,E=require('dkjson'),require('entity_db')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/game_gui.lua 8977')==0)
local fn=assert(loadfile('analysis/function-bytecode/game_gui_line8977.lua'));local store={player_gold=1000};local signals,sounds={},{}
local bindings={game_gui={game={store=store}},UP={get_upgrade=function()return nil end},S={queue=function(_,name)sounds[#sounds+1]=name end},signal={emit=function(name)signals[#signals+1]=name end},wid=function()return {show=function()end}end}
for i=1,30 do local n=debug.getupvalue(fn,i);if not n then break end;assert(bindings[n],n);debug.setupvalue(fn,i,bindings[n])end
local previousMobile=IS_MOBILE;IS_MOBILE=true
local entity=E:create_entity('tower_archers_lvl4');entity.tower.spent=1000
local self={parent={},entity=entity,item={action='upgrade_power',action_arg='skill_b',no_upgrade_lights=true,sounds={'TowerArcherGarrisonSkillBTaunt'}},disable=function()end,deselect=function()end}
local rows={};for i=1,4 do fn(self);rows[#rows+1]={level=entity.powers.skill_b.level,changed=entity.powers.skill_b.changed,gold=store.player_gold,spent=entity.tower.spent,sounds=table.deepclone(sounds),signals=table.deepclone(signals)}end
IS_MOBILE=previousMobile
local f=assert(io.open('analysis/tower-power-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original tower-power purchase/spent/changed/sound/signal cases exported')
store.player_gold=1000;signals,sounds={},{};IS_MOBILE=true
entity=E:create_entity('tower_wizard_lvl4');entity.tower.spent=1000
self.entity=entity;self.item.sounds={'TowerScholarMageSkillBTaunt'}
local wizardRows={};for i=1,4 do fn(self);wizardRows[#wizardRows+1]={level=entity.powers.skill_b.level,changed=entity.powers.skill_b.changed,gold=store.player_gold,spent=entity.tower.spent,sounds=table.deepclone(sounds),signals=table.deepclone(signals)}end
IS_MOBILE=previousMobile
local f=assert(io.open('analysis/wizard-power-oracle.json','w'));f:write(J.encode(wizardRows));f:close();print('Original wizard B purchase, prices, spent and max-level cases exported')
store.player_gold=2000;signals,sounds={},{};IS_MOBILE=true
entity=E:create_entity('tower_catapult_lvl4');entity.tower.spent=1000
self.entity=entity;self.item.sounds={'TowerRoyalCatapultSkillBTaunt'}
local catapultRows={};for i=1,4 do fn(self);catapultRows[#catapultRows+1]={level=entity.powers.skill_b.level,changed=entity.powers.skill_b.changed,gold=store.player_gold,spent=entity.tower.spent,sounds=table.deepclone(sounds),signals=table.deepclone(signals)}end
IS_MOBILE=previousMobile
local f=assert(io.open('analysis/catapult-power-oracle.json','w'));f:write(J.encode(catapultRows));f:close();print('Original catapult B purchase, prices, spent and max-level cases exported')

store.player_gold=2000;signals,sounds={},{};IS_MOBILE=true
entity=E:create_entity('tower_catapult_lvl4');entity.tower.spent=1000
self.entity=entity;self.item.action_arg='skill_a';self.item.sounds={'TowerRoyalCatapultSkillATaunt'}
local tarRows={};for i=1,4 do fn(self);tarRows[#tarRows+1]={level=entity.powers.skill_a.level,changed=entity.powers.skill_a.changed,gold=store.player_gold,spent=entity.tower.spent,sounds=table.deepclone(sounds),signals=table.deepclone(signals)}end
IS_MOBILE=previousMobile
local f=assert(io.open('analysis/catapult-tar-power-oracle.json','w'));f:write(J.encode(tarRows));f:close();print('Original catapult A purchase, prices, spent and max-level cases exported')

store.player_gold=2000;signals,sounds={},{};IS_MOBILE=true
entity=E:create_entity('tower_catapult_lvl4');entity.tower.spent=1000
self.entity=entity;self.item.action_arg='skill_c';self.item.sounds={'TowerRoyalCatapultSkillCTaunt'}
local trapRows={};for i=1,4 do fn(self);trapRows[#trapRows+1]={level=entity.powers.skill_c.level,changed=entity.powers.skill_c.changed,gold=store.player_gold,spent=entity.tower.spent,sounds=table.deepclone(sounds),signals=table.deepclone(signals)}end
IS_MOBILE=previousMobile
local f=assert(io.open('analysis/catapult-trap-power-oracle.json','w'));f:write(J.encode(trapRows));f:close();print('Original catapult C purchase, prices, spent and max-level cases exported')

store.player_gold=2000;signals,sounds={},{};IS_MOBILE=true
entity=E:create_entity('tower_wizard_lvl4');entity.tower.spent=1000
self.entity=entity;self.item.action_arg='skill_a';self.item.sounds={'TowerScholarMageSkillATaunt'}
local fireRows={};for i=1,4 do fn(self);fireRows[#fireRows+1]={level=entity.powers.skill_a.level,changed=entity.powers.skill_a.changed,gold=store.player_gold,spent=entity.tower.spent}end
IS_MOBILE=previousMobile
local f=assert(io.open('analysis/wizard-firebook-power-oracle.json','w'));f:write(J.encode(fireRows));f:close();print('Original wizard A purchase and max-level cases exported')
