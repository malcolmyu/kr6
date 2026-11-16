TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,S,A,sim=require('entity_db'),require('systems'),require('klove.animation_db'),require('klove.simulation');simulation=sim;SSO=nil
local def=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/go_towers_archers/archer_markDef.exo3');local counts={}
for _,a in ipairs(def.animations)do counts[a.name]=#a.frames end
local encode=dofile('scripts/precise_json.lua')
local f=assert(io.open('public/data/archers-mark.json','w'));f:write(encode({frames=counts,fps=def.fps,bossFlag=F_BOSS}));f:close()
local rows={}
for level=1,3 do for _,birth in ipairs({0,1795})do for _,kind in ipairs({'normal','boss','refresh','upgrade','lower','dead','removed','missing','vis-ban','last-node','move','stack','refresh-fade'})do
 local store={};sim:init(store,S,{'mod_lifecycle','main_script'},TICK_LENGTH);store.tick=birth;store.tick_ts=birth*TICK_LENGTH
 local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=500,y=350};e.health.hp=1000;e.health.hp_max=1000;e.unit.mod_offset={x=7,y=13};e.nav_path.ni=100;e.health.damage_factor=kind=='stack'and 1.2 or 1
 if kind=='boss'then e.vis.flags=bit.bor(e.vis.flags,F_BOSS)end
 if kind=='vis-ban'then e.vis.bans=bit.bor(e.vis.bans,F_MOD)end
 if kind~='missing'then sim:queue_insert_entity(e)end;sim:do_tick()
 local function add(rank)local m=E:create_entity('mod_archers_skill_c_weak');m.modifier.target_id=e.id;m.modifier.level=rank;if kind=='last-node'then m.modifier.last_node=104 end;sim:queue_insert_entity(m)end
 local frames={}
 for tick=1,330 do
  if tick==1 then add(level)end
  if tick==31 and kind=='refresh'then add(level)end
  if tick==31 and kind=='upgrade'and level<3 then add(level+1)end
  if tick==31 and kind=='lower'and level>1 then add(level-1)end
  if tick==61 and kind=='dead'then e.health.hp=0;e.health.dead=true end
  if tick==61 and kind=='removed'then sim:queue_remove_entity(e)end
  if kind=='last-node'and tick>=31 then e.nav_path.ni=105 end
  if kind=='move'then e.pos.x=e.pos.x+1;e.pos.y=e.pos.y+.5;e.render.sprites[1].flip_x=tick%60>=30 end
  if kind=='stack'and tick==101 then e.health.damage_factor=e.health.damage_factor*1.4 end
  if kind=='refresh-fade'and tick==(level==1 and 155 or level==2 and 185 or 215)then add(level)end
  sim:do_tick();local marks={}
  for _,m in pairs(store.entities)do if m.template_name=='mod_archers_skill_c_weak'then
   local s=m.render and m.render.sprites[1]
   marks[#marks+1]={level=m.modifier.level,at=m.modifier.ts,duration=m.modifier.duration,factor=m.received_damage_factor,animation=s and s.name,spriteAt=s and s.ts,loop=s and s.loop,pos=table.clone(m.pos),offset=s and table.clone(s.offset),pending=not not m.pending_removal}
   if s then local sequence={from=1,to=assert(counts[s.name])};local _,runs,index=A:fni(sequence,store.tick_ts-s.ts,s.loop,s.fps,TICK_LENGTH);s.runs=runs;s.frame_idx=index end
  end end
  table.sort(marks,function(a,b)return a.level<b.level end)
  frames[#frames+1]={tick=store.tick,at=store.tick_ts,factor=e.health.damage_factor,marks=marks}
 end
 rows[#rows+1]={level=level,birth=birth,kind=kind,frames=frames}
end end end
f=assert(io.open('analysis/archers-mark-oracle.json','w'));f:write(encode(rows));f:close();print(#rows..' original archers mark lifecycle/main/remove traces')
