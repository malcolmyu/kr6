local f=assert(io.open('scripts/export_archers_pierce_cast.lua'));local source=f:read('*a');f:close()
source=source:gsub('for level=1,3 do for _,birth in ipairs%({0,1795}%)[^\n]+',[[for level=1,1 do for _,birth in ipairs({0,1795,12232})do for _,kind in ipairs({'ac-same','c-in-a-10','c-in-a-41','c-in-a-50','c-in-a-58','a-in-c-10','a-in-c-28','a-in-c-29','upgrade-c-in-a'})do]])
source=source:gsub('local tick,events,children,firstCast,upgradeTick=0,{},{},nil,nil','local tick,events,children,firstCast,upgradeTick,firstC,aPurchaseTick,cPurchaseTick,cUpgradeTick=0,{},{},nil,nil,nil,nil,nil,nil',1)
source=source:gsub("S.queue=function%(_,name%)", "S.queue=function(_,name)if name=='TowerArcherGarrisonMarkOfTheEagleCast'and not firstC then firstC=tick end;",1)
source=source:gsub('if tick==20 then tower.powers.skill_a.level=level;tower.powers.skill_a.changed=true end',function()return [[if tick==20 and not kind:match('^a%-in%-c')then tower.powers.skill_a.level=1;tower.powers.skill_a.changed=true;aPurchaseTick=tick end
  if tick==20 and(kind=='ac-same'or kind=='upgrade-c-in-a'or kind:match('^a%-in%-c'))then tower.powers.skill_c.level=1;tower.powers.skill_c.changed=true;cPurchaseTick=tick end
  local cOffset=tonumber(kind:match('^c%-in%-a%-(%d+)$'));if cOffset and firstCast and tick==firstCast+cOffset and not cPurchaseTick then tower.powers.skill_c.level=1;tower.powers.skill_c.changed=true;cPurchaseTick=tick end
  local aOffset=tonumber(kind:match('^a%-in%-c%-(%d+)$'));if aOffset and firstC and tick==firstC+aOffset and not aPurchaseTick then tower.powers.skill_a.level=1;tower.powers.skill_a.changed=true;aPurchaseTick=tick end
  if kind=='upgrade-c-in-a'and tick==25 then tower.powers.skill_c.level=2;tower.powers.skill_c.changed=true;cUpgradeTick=tick end]]end,1)
source=source:gsub('tick=store.tick,name=m.template_name,','tick=store.tick,name=m.template_name,modifierLevel=m.modifier and m.modifier.level,',1)
source=source:gsub('basicTs=tower.attacks.list%[1%].ts,','basicTs=tower.attacks.list[1].ts,markTs=tower.timed_attacks.list[2].ts,',1)
source=source:gsub('kind=kind,upgradeTick=upgradeTick,','kind=kind,aPurchaseTick=aPurchaseTick or false,cPurchaseTick=cPurchaseTick,cUpgradeTick=cUpgradeTick,upgradeTick=upgradeTick,',1)
source=source:gsub('rows%[#rows%+1%]=',function()return [[assert(aPurchaseTick and cPurchaseTick,'missing A/C input schedule');rows[#rows+1]=]]end,1)
source=source:gsub('archers%-pierce%-cast%-oracle.json','archers-ac-cast-oracle.json')
assert(loadstring(source,'@scripts/export_archers_pierce_cast.lua'))()
