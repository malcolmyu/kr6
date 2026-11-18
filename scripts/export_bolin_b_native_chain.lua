BOLIN_CHAIN_TRANSFORM=function(source)
 -- B modes belong only to this driver; do not also run same-named base fixtures.
 local baseCount;source,baseCount=source:gsub("local mode=arg%[11%]or'normal'","local mode='normal'");assert(baseCount==2)
 local count;source,count=source:gsub('if tick==20 then',"if tick==20 then if arg[11]~='wave0'then store.wave_group_number=1 end;",1);assert(count==1)
 local marker="  local mode='normal'\n";local at=assert(source:find(marker,1,true))
 source=source:sub(1,at-1)..[[
  local bmode=arg[11]or'normal'
  if tick==22 and bmode~='nearby'then for _,e in pairs(store.entities)do if e.webBolinTarget then e.pos.x=1000;e.pos.y=650 end end end
  if tick==21 and bmode=='far-cap'then local hero;for _,h in pairs(store.entities)do if h.template_name=='hero_bolin'then hero=h end end;for i=1,4 do local m=E:create_entity('aura_bolin_skill_b_trigger');m.pos={x=50+i*50,y=100};m.source_id=hero.id;m.render.sprites[1].ts=store.tick_ts;sim:queue_insert_entity(m)end end
  if bmode=='no-space'and tick==350 then for _,h in pairs(store.entities)do if h.template_name=='hero_bolin'then h.timed_attacks.list[2].min_dist_between_mines=1e6 end end end
  if ((bmode=='stun-start'and tick==185)or(bmode=='stun-throw'and tick==200)or(bmode=='stun-boundary'and tick==210)or(bmode=='stun-end'and tick==222))or(bmode:find('stun',1,true)and tick==230)then for _,h in pairs(store.entities)do if h.template_name=='hero_bolin'then h.unit.is_stunned=tick~=230 end end end
  if(bmode=='death-start'and tick==185)or(bmode=='death-tail'and tick==215)then for _,h in pairs(store.entities)do if h.template_name=='hero_bolin'then h.health.hp=0;h.health.dead=true;h.health.death_ts=store.tick_ts end end end
  local early=bmode=='force-before-arm'or bmode=='enemy-before-arm'
  local move=bmode=='trigger'or bmode=='trigger-edge'or bmode=='damage-edge'or bmode=='damage-outside'or bmode=='flying'or bmode=='force-flying'or bmode=='immune'or bmode=='armor'or bmode=='combo'
  if early and tick==260 or move and tick==450 or bmode=='force'and tick==450 then
   local first;for id,m in pairs(store.entities)do if m.template_name=='aura_bolin_skill_b_trigger'and(not first or id<first.id)then first=m end end;assert(first,'B fixture requires an actual armed/arming mine')
   if bmode=='force-before-arm'or bmode=='force'or bmode=='damage-edge'or bmode=='damage-outside'then first.trigger=true end
   if bmode~='force'and bmode~='force-before-arm'then for _,e in pairs(store.entities)do if e.webBolinTarget then e.pos.x=first.pos.x+(bmode=='trigger-edge'and 30 or bmode=='damage-edge'and 45 or bmode=='damage-outside'and 45.001 or 0);e.pos.y=first.pos.y;if bmode=='flying'or bmode=='force-flying'then e.vis.flags=bit.bor(e.vis.flags,F_FLYING)elseif bmode=='immune'then e.health.ignore_damage=true elseif bmode=='armor'then e.health.armor=.6 end end end end
  end
  if bmode=='force-flying'and tick==500 then local first;for id,m in pairs(store.entities)do if m.template_name=='aura_bolin_skill_b_trigger'and(not first or id<first.id)then first=m end end;assert(first);first.trigger=true end
  if bmode=='combo'and tick==600 then for i=0,2 do local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos=table.clone(require('path_db'):node_pos(1,1,80+i));e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=80+i;sim:queue_insert_entity(e)end end
]]..source:sub(at)
 return source
end
dofile('scripts/export_bolin_native_chain.lua')
