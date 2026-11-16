TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,S,A,Sound,J=require('entity_db'),require('script_utils'),require('systems'),require('klove.animation_db'),require('sound_db'),require('dkjson');local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local rows={}
for _,name in ipairs({'hero_gerald','hero_zefira'})do for _,birth in ipairs({0,6079})do for _,lifetime in ipairs({20,30})do
 local h=E:create_entity(name);local store={tick=birth,tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={},render_frames={}};h.pos={x=500,y=350};assert(h.main_script.insert(h,store));h.health.hp=0;h.health.hp_max=200;h.health.dead=true;h.health.dead_lifetime=lifetime;h.health.death_ts=store.tick_ts;h.render.sprites[1].ts=store.tick_ts;h.render.sprites[1].flip_x=true;h.nav_rally.new=false;store.entities[h.id]=h
 local events,inserts,removals,frames,sounds={},{},{},{},{};simulation={queue_insert_entity=function(_,e)inserts[#inserts+1]=e;events[#events+1]={tick=store.tick,kind='queueInsert',template=e.template_name}end,queue_remove_entity=function(_,e)if e.pending_removal then return end;e.pending_removal=true;removals[#removals+1]=e;events[#events+1]={tick=store.tick,kind='queueRemove',template=e.template_name}end}
 Sound.queue=function(_,sound)if sound then sounds[#sounds+1]={tick=store.tick,name=sound}end end
 local co=coroutine.create(function()SU.y_hero_death_and_respawn_kr5(store,h)end)
 for relative=1,1100 do
  store.tick=birth+relative;store.tick_ts=store.tick*TICK_LENGTH
  for _,e in ipairs(inserts)do S.tween:on_insert(e,store);store.entities[e.id]=e;events[#events+1]={tick=store.tick,kind='insert',template=e.template_name}end;inserts={}
  for _,e in ipairs(removals)do e.pending_removal=nil;store.entities[e.id]=nil;events[#events+1]={tick=store.tick,kind='remove',template=e.template_name}end;removals={}
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co);assert(ok,debug.traceback(co,tostring(err)))end
  S.tween:on_update(TICK_LENGTH,store.tick_ts,store)
  local p=h.render.sprites[1];local count;for _,a in ipairs(art.exos[p.prefix].animations)do if a.name==p.name then count=#a.frames end end;assert(count,p.name);local _,runs,frame=A:fni({from=1,to=count,prefix='original'},store.tick_ts-p.ts,p.loop,p.fps,TICK_LENGTH);p.runs=runs;p.frame_idx=frame
  local tomb;for _,e in pairs(store.entities)do if e~=h then tomb={name=e.template_name,pos=table.clone(e.pos),at=e.render.sprites[1].ts,flip=e.render.sprites[1].flip_x,alpha=e.render.sprites[1].alpha,tweenDisabled=e.tween and e.tween.disabled,tweenAt=e.tween and e.tween.ts}end end
  frames[#frames+1]={tick=store.tick,hp=h.health.hp,dead=h.health.dead,ignore=h.health.ignore_damage,finished=h.health.death_finished_ts,animation=p.name,at=p.ts,loop=p.loop,canClick=h.ui.can_click,tomb=tomb,done=coroutine.status(co)=='dead'}
 end
 rows[#rows+1]={name=name,birth=birth,lifetime=lifetime,frames=frames,events=events,sounds=sounds}
end end end
local f=assert(io.open('analysis/hero-life-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original full ordinary hero death/tomb/respawn traces')
