TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local E,P,G,J=require('entity_db'),require('path_db'),require('grid_db'),require('dkjson');local rows={}
for stage=1,3 do
 G:load(string.format('level%02d',stage));P:load(string.format('level%02d',stage),{left=-512/3,right=1024+512/3,bottom=0,top=768})
 for _,birth in ipairs({0,6079})do for _,ni in ipairs({10,35,100})do for _,scenario in ipairs({'normal','cap','dead','boss','immune'})do
  local enemy=E:create_entity('enemy_bandit');enemy.health.hp=100;enemy.nav_path.pi=stage==2 and 3 or 1;enemy.nav_path.spi=1;enemy.nav_path.ni=ni;enemy.pos=P:node_pos(enemy.nav_path);if stage==3 then enemy.nav_path.prev_pis={5}end
  if scenario=='cap'then enemy.enemy.counts.mod_teleport=5 elseif scenario=='dead'then enemy.health.dead=true elseif scenario=='boss'then enemy.vis.flags=bit.bor(enemy.vis.flags,F_BOSS)elseif scenario=='immune'then enemy.vis.bans=bit.bor(enemy.vis.bans,F_MOD)end
  local before={pi=enemy.nav_path.pi,spi=1,ni=ni,prev=table.deepclone(enemy.nav_path.prev_pis or{}),flags=enemy.vis.flags,bans=enemy.vis.bans,hp=enemy.health.dead and 0 or enemy.health.hp,count=enemy.enemy.counts.mod_teleport}
  local mod=E:create_entity('mod_gerald_skill_c_teleport');mod.modifier.target_id=enemy.id
  local store={tick=birth,tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={[enemy.id]=enemy}}
  local events,frames,removeTick,co={},{}
  simulation={queue_insert_entity=function(_,e)events[#events+1]={tick=store.tick,name=e.template_name,pos=table.clone(e.pos),at=e.render.sprites[1].ts}end,queue_remove_entity=function(_,e)if not removeTick then mod.main_script.queue(mod,store,false);events[#events+1]={tick=store.tick,remove=true};removeTick=store.tick end end}
  local accepted
  for relative=1,100 do
   store.tick=birth+relative;store.tick_ts=store.tick*TICK_LENGTH
   if relative==1 then mod.main_script.queue(mod,store,true)end
   if relative==2 then accepted=not not mod.main_script.insert(mod,store);if not accepted then mod.main_script.dequeue(mod,store,true)end;if accepted then co=coroutine.create(mod.main_script.update);store.entities[mod.id]=mod end end
   if removeTick and store.tick>removeTick and store.entities[mod.id]then mod.main_script.remove(mod,store);store.entities[mod.id]=nil end
   if co and store.entities[mod.id]and coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,mod,store);assert(ok,debug.traceback(co,tostring(err)))end
   frames[#frames+1]={tick=store.tick,bans=enemy.vis.bans,hp=enemy.health.hp,stun=enemy.unit.stun_count or 0,stunned=not not enemy.unit.is_stunned,ignore=enemy.health.ignore_damage,hidden=enemy.render.sprites[1].hidden_count,count=enemy.enemy.counts.mod_teleport,pi=enemy.nav_path.pi,ni=enemy.nav_path.ni,pos=table.clone(enemy.pos),registered=not not store.entities[mod.id],removing=removeTick~=nil}
  end
  rows[#rows+1]={stage=stage,birth=birth,scenario=scenario,before=before,accepted=accepted,frames=frames,events=events}
 end end end
end
local f=assert(io.open('analysis/native-teleport-runtime-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' native teleport queue/insert/main/remove traces')
