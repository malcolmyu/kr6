TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,S=require('entity_db'),require('utils'),require('sound_db');local rows={}
for level=1,3 do for _,birth in ipairs({0,1795})do for _,kind in ipairs({'normal','empty','late','low-hp','upgrade','blocked','blocked-cast','lost','moving','out-of-range'})do
 local tower=E:create_entity('tower_archers_lvl4');tower.pos={x=500,y=350}
 local target=E:create_entity('enemy_bandit');target.pos={x=600,y=400};target.health.hp=1000;target.motion.speed={x=0,y=0};target.nav_path.ni=100
 local store={tick=birth,tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,wave_group_number=1,entities={[tower.id]=tower,[target.id]=target}}
 local tick,events,children=0,{},{}
 U.find_foremost_enemy=function(_,origin,min,max,pred,flags,bans,filter)
  if kind=='empty'or kind=='late'and tick<80 or target.health.dead or bit.band(target.vis.bans,flags)~=0 or bit.band(target.vis.flags,bans)~=0 or(filter and not filter(target))or not U.is_inside_ellipse(target.pos,origin,max)then return end
  return target,{target},target.pos
 end
 simulation={queue_insert_entity=function(_,m)
  if m.template_name=='controller_archers_shooter'then children[#children+1]=m
  else events[#events+1]={tick=store.tick,name=m.template_name,level=m.modifier and m.modifier.level,pos=table.clone(m.pos)}end
 end,queue_remove_entity=function()end}
 S.queue=function(_,name)events[#events+1]={tick=store.tick,sound=name}end
 local co=coroutine.create(tower.main_script.update);local frames={}
 for relative=1,850 do
  tick=relative;store.tick=birth+relative;store.tick_ts=store.tick*TICK_LENGTH
  if tick==20 then tower.powers.skill_c.level=level;tower.powers.skill_c.changed=true end
  if kind=='upgrade'and tick==25 and level<3 then tower.powers.skill_c.level=level+1;tower.powers.skill_c.changed=true end
  tower.tower.blocked=(kind=='blocked'and tick>=15 and tick<75)or(kind=='blocked-cast'and tick>=25 and tick<75)
  target.health.dead=kind=='lost'and tick>=25;target.health.hp=kind=='low-hp'and 49 or 1000
  if kind=='moving'then target.pos.x=600+tick*.01 end
  if kind=='out-of-range'then target.pos.x=1000 end
  local ok,err=coroutine.resume(co,tower,store);assert(ok,debug.traceback(co,tostring(err)))
  frames[#frames+1]={tick=store.tick,basicTs=tower.attacks.list[1].ts,markTs=tower.timed_attacks.list[2].ts,markLevel=tower.powers.skill_c.level,children={}}
  for _,c in ipairs(children)do frames[#frames].children[#frames[#frames].children+1]=not not c.shoot;c.shoot=false end
 end
 rows[#rows+1]={level=level,birth=birth,kind=kind,frames=frames,events=events}
end end end
local f=assert(io.open('analysis/archers-mark-cast-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original mark tower cast/basic trigger traces')
