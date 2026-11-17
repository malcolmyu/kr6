TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,S,A=require('entity_db'),require('utils'),require('sound_db'),require('klove.animation_db')
local rows={}
for level=1,3 do for _,birth in ipairs({0,1795})do for _,kind in ipairs({'normal','empty','late','upgrade','blocked','blocked-cast','lost','removed','moving','left','opposite','single','banned','empty-release','upgrade-edge-1','upgrade-edge-40','upgrade-edge-41','upgrade-edge-42','upgrade-edge-56','upgrade-edge-57','upgrade-edge-58','upgrade-edge-59','upgrade-edge-60'})do
 local tower=E:create_entity('tower_archers_lvl4');tower.pos={x=500,y=350}
 local pool,entities={}, {[tower.id]=tower};local labels={}
 for i,p in ipairs({{600,400},{650,360},{570,350}})do local e=E:create_entity('enemy_bandit');e.pos={x=p[1],y=p[2]};e.health.hp=1000;e.motion.speed={x=0,y=0};e.nav_path.ni=100+i;e.nav_path.pi=1;pool[i]=e;entities[e.id]=e;labels[e.id]=i end
 local store={tick=birth,tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,wave_group_number=1,entities=entities};local tick,events,children,firstCast,upgradeTick=0,{},{},nil,nil
 U.find_foremost_enemy=function(_,origin,min,max,pred,flags,bans,filter)
  local choices={}
  for i,e in ipairs(pool)do if not(kind=='empty'or kind=='late'and tick<80 or kind=='empty-release'and tick>=40 or kind=='single'and i>1)and entities[e.id]and not e.health.dead and bit.band(e.vis.bans,flags)==0 and bit.band(e.vis.flags,bans)==0 and U.is_inside_ellipse(e.pos,origin,max)and(not filter or filter(e))then choices[#choices+1]=e end end
  return choices[1],#choices>0 and choices or nil,choices[1]and choices[1].pos
 end
 simulation={queue_insert_entity=function(_,m)if m.template_name=='controller_archers_shooter'then children[#children+1]=m else events[#events+1]={tick=store.tick,name=m.template_name,from=m.bullet and table.clone(m.bullet.from),to=m.bullet and table.clone(m.bullet.to),target=m.bullet and labels[m.bullet.target_id],min=m.bullet and m.bullet.damage_min,max=m.bullet and m.bullet.damage_max,factor=m.bullet and m.bullet.damage_factor,flight=m.bullet and m.bullet.flight_time}end end,queue_remove_entity=function()end}
 S.queue=function(_,name)if name=='TowerArcherGarrisonTendonPierceCast'and not firstCast then firstCast=tick end;if name then events[#events+1]={tick=store.tick,sound=name}end end
 local co=coroutine.create(tower.main_script.update);local frames={}
 for relative=1,850 do
  tick=relative;store.tick=birth+tick;store.tick_ts=store.tick*TICK_LENGTH
  if tick==20 then tower.powers.skill_a.level=level;tower.powers.skill_a.changed=true end
  if kind=='upgrade'and tick==25 and level<3 then tower.powers.skill_a.level=level+1;tower.powers.skill_a.changed=true end
  local edge=tonumber(kind:match('^upgrade%-edge%-(%d+)$'));if edge and firstCast and not upgradeTick and tick==firstCast+edge and level<3 then tower.powers.skill_a.level=level+1;tower.powers.skill_a.changed=true;upgradeTick=tick end
  tower.tower.blocked=(kind=='blocked'and tick>=15 and tick<75)or(kind=='blocked-cast'and tick>=25 and tick<75)
  for i,e in ipairs(pool)do e.health.dead=kind=='lost'and tick>=25;if kind=='removed'and tick>=25 then entities[e.id]=nil end;if kind=='moving'then e.pos.x=600+i*20+tick*.01 end;if kind=='left'then e.pos.x=400-i*20 end;if kind=='opposite'then e.pos.x=i==2 and 400 or 600+i*20 end;if kind=='banned'then e.vis.bans=4194304 end end
  local ok,err=coroutine.resume(co,tower,store);assert(ok,debug.traceback(co,tostring(err)))
  local f={tick=store.tick,basicTs=tower.attacks.list[1].ts,pierceTs=tower.attacks.list[2].ts,children={},parts={}}
  for i,c in ipairs(children)do f.children[i]=not not c.shoot;c.shoot=false end
  for _,sid in ipairs(tower.shooters_sids)do local s=tower.render.sprites[sid];f.parts[#f.parts+1]={name=s.name,ts=s.ts,flip=s.flip_x,loop=s.loop}end
  frames[#frames+1]=f
  for _,s in ipairs(tower.render.sprites)do if s.name=='stun'then local _,runs=A:fni({prefix='archer4Def_stun',from=1,to=58},store.tick_ts-s.ts,s.loop,s.fps,store.tick_length);s.runs=runs end end
 end
 rows[#rows+1]={level=level,birth=birth,kind=kind,upgradeTick=upgradeTick,frames=frames,events=events}
end end end
local f=assert(io.open('analysis/archers-pierce-cast-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original A tower cast traces')
