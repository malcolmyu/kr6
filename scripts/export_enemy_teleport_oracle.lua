EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local E=require('entity_db');local P=require('path_db');local G=require('grid_db');local J=require('dkjson');local cases={}
for stage=1,3 do
 local prefix=string.format('level%02d',stage);G:load(prefix);P:load(prefix,{left=-512/3,right=1024+512/3,bottom=0,top=768})
 for _,source in ipairs(stage==1 and{{1,1}}or stage==2 and{{3,1}}or{{5,2},{1,3}})do
  for _,ni in ipairs({1,10,35,100})do
   local enemy=E:create_entity('enemy_bandit');enemy.nav_path.pi=source[1];enemy.nav_path.spi=source[2];enemy.nav_path.ni=ni;enemy.health.hp=100;enemy.pos=P:node_pos(enemy.nav_path)
   if stage==3 and source[1]==1 then enemy.nav_path.prev_pis={5}end
   local before={pi=enemy.nav_path.pi,spi=enemy.nav_path.spi,ni=ni,prev=enemy.nav_path.prev_pis and{5}or{}}
   local mod=E:create_entity('mod_gerald_skill_c_teleport');mod.modifier.target_id=enemy.id
   local store={tick_ts=0,tick_length=1/30,entities={[enemy.id]=enemy,[mod.id]=mod}};local done=false;local events={}
   simulation={queue_insert_entity=function(_,e)events[#events+1]={at=store.tick_ts,name=e.template_name,pos=table.deepclone(e.pos)}end,queue_remove_entity=function(_,e)if e.id==mod.id then done=true end end}
   mod.main_script.queue(mod,store,true);assert(mod.main_script.insert(mod,store));mod.main_script.dequeue(mod,store,true)
   local co=coroutine.create(mod.main_script.update);local frames={}
   for frame=0,100 do store.tick_ts=frame/30;local ok,err=coroutine.resume(co,mod,store);assert(ok,debug.traceback(co,tostring(err)))
    if done then mod.main_script.queue(mod,store,false);mod.main_script.remove(mod,store);mod.main_script.dequeue(mod,store,false)end
    frames[#frames+1]={at=store.tick_ts,pi=enemy.nav_path.pi,ni=enemy.nav_path.ni,pos=table.deepclone(enemy.pos),hidden=enemy.render.sprites[1].hidden_count,stunned=enemy.unit.is_stunned,ignore=enemy.health.ignore_damage,bans=enemy.vis.bans,count=enemy.enemy.counts.mod_teleport,done=done}
    if done then break end
   end
   cases[#cases+1]={stage=stage,before=before,frames=frames,events=events}
  end
 end
end
local f=assert(io.open('analysis/enemy-teleport-oracle.json','w'));f:write(J.encode(cases));f:close();print(#cases..' native teleport modifier traces')
local selection={}
for _,case in ipairs({{name='enemy_bandit',count=0},{name='enemy_bandit',count=4},{name='enemy_bandit',count=5},{name='enemy_crow',count=0},{name='enemy_bandit',count=0,dead=true},{name='enemy_bandit',count=0,boss=true},{name='enemy_bandit',count=0,immune=true}})do
 local enemy=E:create_entity(case.name);enemy.enemy.counts.mod_teleport=case.count;enemy.health.dead=case.dead or false
 if case.boss then enemy.vis.flags=require('bit').bor(enemy.vis.flags,F_BOSS)end;if case.immune then enemy.vis.bans=require('bit').bor(enemy.vis.bans,F_MOD)end
 local mod=E:create_entity('mod_gerald_skill_c_teleport');mod.modifier.target_id=enemy.id;local store={entities={[enemy.id]=enemy},tick_ts=0}
 mod.main_script.queue(mod,store,true);local inserted=mod.main_script.insert(mod,store);mod.main_script.dequeue(mod,store,true)
 selection[#selection+1]={name=case.name,count=case.count,dead=case.dead or false,flags=enemy.vis.flags,bans=enemy.vis.bans,inserted=inserted}
end
local f=assert(io.open('analysis/enemy-teleport-selection-oracle.json','w'));f:write(J.encode(selection));f:close()
