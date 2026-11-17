local f=assert(io.open('scripts/export_archers_pierce_cast.lua'));local source=f:read('*a');f:close()
local function replace(old,new)local a,b=assert(source:find(old,1,true));source=source:sub(1,a-1)..new..source:sub(b+1)end
local a,b=assert(source:find('for level=1,3 do for _,birth in ipairs',1,true));local ending=assert(source:find('\n',b,true))
source=source:sub(1,a-1)..[[for level=1,1 do for _,birth in ipairs({0,1795,12232})do for _,kind in ipairs({'b-only','abc-same','b-in-a-10','b-in-a-41','b-in-a-50','b-in-a-58','a-in-b','b-in-c-10','b-in-c-28','b-in-c-29','c-in-b','b-upgrade-in-a','blocked-source','no-target'})do]]..source:sub(ending)
replace('local tick,events,children,firstCast,upgradeTick=0,{},{},nil,nil','local tick,events,children,firstCast,upgradeTick,firstC,actions=0,{},{},nil,nil,nil,{}')
replace("simulation={queue_insert_entity=function(_,m)",[[local wizard=E:create_entity('tower_wizard_lvl1');wizard.pos={x=600,y=350};wizard.main_script=nil;entities[wizard.id]=wizard;labels[tower.id]='source';labels[wizard.id]='wizard'
 if kind=='no-target'then tower.tower.can_be_mod=false;wizard.tower.can_be_mod=false end
 U.find_towers=function(_,origin,min,max,filter)local out={};for _,t in ipairs({tower,wizard})do if U.is_inside_ellipse(t.pos,origin,max)and(not filter or filter(t))then out[#out+1]=t end end;return out end
 simulation={queue_insert_entity=function(_,m)]])
replace('tick=store.tick,name=m.template_name,','tick=store.tick,name=m.template_name,modifierLevel=m.modifier and m.modifier.level,rangeFactor=m.range_factor,modifierTarget=m.modifier and labels[m.modifier.target_id],')
replace('S.queue=function(_,name)',"S.queue=function(_,name)if name=='TowerArcherGarrisonMarkOfTheEagleCast'and not firstC then firstC=tick end;")
replace('if tick==20 then tower.powers.skill_a.level=level;tower.powers.skill_a.changed=true end',[[local function buy(power,rank)local p=tower.powers[power];p.level=rank;p.changed=true;actions[#actions+1]={tick=tick,power=power,level=rank}end
  if tick==20 then
   if kind=='abc-same'or kind:match('^b%-in%-a')or kind=='b-upgrade-in-a'then buy('skill_a',1)end
   if kind=='abc-same'or kind:match('^b%-in%-c')then buy('skill_c',1)end
   if not kind:match('^b%-in%-[ac]')then buy('skill_b',1)end
  end
  if tick==31 and kind=='a-in-b'then buy('skill_a',1)end
  if tick==31 and kind=='c-in-b'then buy('skill_c',1)end
  local afterA=tonumber(kind:match('^b%-in%-a%-(%d+)$'));if afterA and firstCast and tick==firstCast+afterA then buy('skill_b',1)end
  local afterC=tonumber(kind:match('^b%-in%-c%-(%d+)$'));if afterC and firstC and tick==firstC+afterC then buy('skill_b',1)end
  if kind=='b-upgrade-in-a'and tick==25 then buy('skill_b',2)end
  if kind=='b-upgrade-in-a'and tick==40 then buy('skill_b',3)end]])
replace('tower.tower.blocked=(kind==',"tower.tower.blocked=kind=='blocked-source'and tick>=15 and tick<75 or(kind==")
replace('basicTs=tower.attacks.list[1].ts,','basicTs=tower.attacks.list[1].ts,rangeTs=tower.timed_attacks.list[1].ts,markTs=tower.timed_attacks.list[2].ts,')
replace('kind=kind,upgradeTick=upgradeTick,','kind=kind,actions=actions,upgradeTick=upgradeTick,')
replace("analysis/archers-pierce-cast-oracle.json","analysis/archers-abc-cast-oracle.json")
assert(loadstring(source,'@scripts/export_archers_pierce_cast.lua'))()
