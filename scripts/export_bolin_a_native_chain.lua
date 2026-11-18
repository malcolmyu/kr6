-- Controlled legal Smoke Mortar fixture, running every shipped main callback.
BOLIN_CHAIN_TRANSFORM=function(source)
 local count;source,count=source:gsub('{x=450,y=400}','{x=350,y=358}');assert(count==4)
 source,count=source:gsub('e.pos=positions%[mode%]or{x=550,y=400}','e.pos=positions[mode]or{x=570,y=358}');assert(count==1)
 local marker="  local mode=arg[11]or'normal'\n";local at=assert(source:find(marker,1,true))
 source=source:sub(1,at-1)..[[
  if tick==21 then for i=1,2 do local e=E:create_entity('enemy_bandit');e.main_script=nil;e.webBolinMortarTarget=true;e.pos=table.clone(require('path_db'):node_pos(1,1,100+i));e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100+i;sim:queue_insert_entity(e)end end
  local amode=arg[11]or'normal'
  if tick==22 then for _,e in pairs(store.entities)do
   if e.template_name=='hero_bolin'and amode=='mortar-left'then e.pos={x=790,y=358};e.nav_rally.center={x=790,y=358};e.nav_rally.pos={x=790,y=358};e.motion.dest={x=790,y=358}end
   if e.webBolinTarget or e.webBolinMortarTarget then
    if amode=='few'and e.nav_path.ni==102 then sim:queue_remove_entity(e)end
    if amode=='flying'and e.nav_path.ni==102 then e.vis.flags=bit.bor(e.vis.flags,F_FLYING)end
    if amode=='no-target'then e.pos.x=1000;e.pos.y=650 end
   end
  end end
  if tick==22 and(amode=='edge20'or amode=='edge19'or amode=='edge20-path6')then local P=require('path_db');local last=amode=='edge19'and 19 or 20;local pi=amode=='edge20-path6'and 6 or 1;local center=P:node_pos(pi,1,last)
   for _,e in pairs(store.entities)do if e.template_name=='hero_bolin'then e.pos={x=center.x-220,y=center.y};e.nav_rally.center=table.clone(e.pos);e.nav_rally.pos=table.clone(e.pos);e.motion.dest=table.clone(e.pos)elseif e.webBolinTarget or e.webBolinMortarTarget then e.nav_path.ni=last+e.nav_path.ni-102;e.nav_path.pi=pi;e.pos=table.clone(P:node_pos(pi,1,e.nav_path.ni))end end
  end
  if (amode=='a-stun-before'and tick==500)or(amode=='a-stun-boundary'and tick==526)or(amode=='a-stun-after'and tick==530)or(amode:find('a-stun',1,true)and tick==550)then for _,e in pairs(store.entities)do if e.template_name=='hero_bolin'then e.unit.is_stunned=tick~=550 end end end
  if(amode=='a-death-before'and tick==500)or(amode=='a-death-after'and tick==530)then for _,e in pairs(store.entities)do if e.template_name=='hero_bolin'then e.health.hp=0;e.health.dead=true;e.health.death_ts=store.tick_ts end end end
  if amode=='a-remove'and tick==500 then for _,e in pairs(store.entities)do if e.webBolinTarget or e.webBolinMortarTarget then sim:queue_remove_entity(e)end end end
  if (amode=='a-leave'and(tick==580 or tick==650))or(amode=='invulnerable'and tick==550)or(amode=='flying-after'and tick==550)then for _,e in pairs(store.entities)do if e.webBolinTarget or e.webBolinMortarTarget then
   if amode=='invulnerable'then e.motion.invulnerable=true elseif amode=='flying-after'then e.vis.flags=bit.bor(e.vis.flags,F_FLYING)else local p=tick==580 and{x=1000,y=650}or require('path_db'):node_pos(1,1,e.nav_path.ni);e.pos.x=p.x;e.pos.y=p.y end
  end end end
]]..source:sub(at)
 return source
end
dofile('scripts/export_bolin_native_chain.lua')
