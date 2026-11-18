EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,G,UP,S,systems=require('entity_db'),require('dkjson'),require('grid_db'),require('upgrades'),require('sound_db'),require('systems');SSO=require('klove.sso')
UP.get_upgrade=function()end;require('path_db').is_node_valid=function()return true end
local rows={}
for level=1,3 do for _,factor in ipairs({1,1.75})do for _,water in ipairs({false,true})do
 local origin={x=725.3333333333334,y=384}
 local store={visible_coords={left=-512/3,right=1024+512/3,bottom=0,top=768},tick_ts=0,tick_length=1/30,entities={},damage_queue={},player_gold=0,gems_collected=0};local calls,mods,fx,pops,sounds=0,{},{},{},{}
 math.random=function(a,b)calls=calls+1;return a and a+math.floor(.1*(b-a+1))or .1 end
 G.cell_type=function()return water and TERRAIN_WATER or TERRAIN_LAND end;S.queue=function(_,name)if name then sounds[#sounds+1]=name end end
 simulation={queue_insert_entity=function(_,e)if e then if e.modifier then mods[#mods+1]={target=store.entities[e.modifier.target_id].webKey,level=e.modifier.level}elseif e.pop_y_offset then pops[#pops+1]={at=store.tick_ts,pos=table.deepclone(e.pos),rotation=e.render.sprites[1].r,frame=e.render.sprites[1].name}elseif not e.template_name:match('^ps_')then fx[#fx+1]={name=e.template_name,pos=table.deepclone(e.pos)}end end end,queue_remove_entity=function()end}
 local enemies={}
 for i,o in ipairs({{0,0},{45,0},{90,0},{90.00001,0},{0,63},{0,63.00001},{0,0,air=true},{0,0,immune=true}})do
  local e=E:create_entity('enemy_bandit');e.pos={x=origin.x+o[1],y=origin.y+o[2]};e.health.hp=1000;e.health.hp_max=1000;e.enemy.gold=0;e.enemy.gems=0;e.webKey=i;if o.air then e.vis.flags=bit.bor(e.vis.flags,128)end;if o.immune then e.vis.bans=bit.bor(e.vis.bans,8)end
  store.entities[e.id]=e;enemies[#enemies+1]=e
 end
 if SSO then systems.sso:on_update(1/30,0,store)end
 local b=E:create_entity('bullet_culverine_skill_a_lvl'..level);b.pos={x=origin.x-120,y=origin.y+40};b.bullet.from=table.deepclone(b.pos);b.bullet.to=table.clone(origin);b.bullet.level=level;b.bullet.damage_factor=factor;b.bullet.particles_name=nil
 -- Sulfur bullet copies the actual tower factor.
 assert(b.main_script.insert(b,store));local co=coroutine.create(b.main_script.update);local frames={};local packets={}
 for tick=0,40 do
  store.tick_ts=tick*(1/30);assert(coroutine.resume(co,b,store));for _,d in ipairs(store.damage_queue)do packets[#packets+1]={target=store.entities[d.target_id].webKey,value=d.value,type=d.damage_type}end;systems.health:on_update(store.tick_length,store.tick_ts,store)
  local hp={};for _,e in ipairs(enemies)do hp[#hp+1]=e.health.hp end
  frames[#frames+1]={at=store.tick_ts,pos=table.deepclone(b.pos),rotation=b.render.sprites[1].r,hidden=b.render.sprites[1].hidden or false,hp=hp,calls=calls,done=coroutine.status(co)=='dead'}
  if coroutine.status(co)=='dead'then break end
 end
 local actorIds={};for _,e in ipairs(enemies)do actorIds[#actorIds+1]=e.id end
 rows[#rows+1]={origin=origin,actorIds=actorIds,level=level,factor=factor,water=water,frames=frames,packets=packets,mods=mods,fx=fx,pops=pops,sounds=sounds}
end end end
local f=assert(io.open('analysis/culverine-sulfur-spatial-impact-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original firebook flight/radial/queued-burn/landing effects cases exported')
