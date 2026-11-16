TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,S,A,J=require('entity_db'),require('utils'),require('systems'),require('klove.animation_db'),require('dkjson');local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local rows={}
for level=1,3 do for _,birth in ipairs({0,19,1795})do for _,kind in ipairs({'target','empty','target-leaves'})do for _,roll in ipairs({.2,.8})do
 local h=E:create_entity('aura_wizard_skill_c');h.pos={x=500,y=350};h.aura.level=level
 local e=E:create_entity('enemy_bandit');e.pos={x=590,y=360};local store={tick=birth,tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={[h.id]=h}};local calls,frame,events=0,0,{};local removal
 U.find_enemies_in_range=function()if kind=='empty'or kind=='target-leaves'and frame>=80 then return nil end;return {e}end
 math.random=function(a,b)calls=calls+1;return a and a+math.floor(roll*(b-a+1))or roll end
 simulation={queue_insert_entity=function(_,b)events[#events+1]={tick=store.tick,name=b.template_name,from=table.clone(b.bullet.from),to=table.clone(b.bullet.to),target=b.bullet.target_id and true or false,min=b.bullet.damage_min,max=b.bullet.damage_max,calls=calls}end,queue_remove_entity=function(_,o)if not o.pending_removal then o.pending_removal=true;removal=store.tick;events[#events+1]={tick=store.tick,remove=true,calls=calls}end end}
 local co=coroutine.create(h.main_script.update);local frames={}
 for relative=1,400 do frame=relative;store.tick=birth+relative;store.tick_ts=store.tick*TICK_LENGTH
  if removal and store.tick>removal then store.entities[h.id]=nil end
  if store.entities[h.id]then local ok,err=coroutine.resume(co,h,store);assert(ok,debug.traceback(co,tostring(err)));S.tween:on_update(TICK_LENGTH,store.tick_ts,store)end
  local sprite=h.render.sprites[1];local a=assert(art.animations[sprite.prefix..'_'..sprite.name]);local _,runs,fn=A:fni(a,store.tick_ts-sprite.ts,sprite.loop,sprite.fps,TICK_LENGTH);sprite.runs=runs;sprite.frame_idx=fn
  frames[#frames+1]={tick=store.tick,animation=sprite.name,at=sprite.ts,loop=sprite.loop,alpha=sprite.alpha,removed=not store.entities[h.id],pending=not not h.pending_removal,tween=not h.tween.disabled,tweenAt=h.tween.ts,calls=calls}
 end
 rows[#rows+1]={level=level,birth=birth,kind=kind,roll=roll,frames=frames,events=events}
end end end end
local f=assert(io.open('analysis/wizard-copies-aura-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original landed book aura traces')
