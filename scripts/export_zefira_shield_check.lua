EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local S=require('sound_db');local oldQueue=S.queue;S.queue=function()end
local E=require('entity_db');local P=require('path_db');local J=require('dkjson');local oldValid=P.is_node_valid;P.is_node_valid=function()return true end;local rows={}
for _,born in ipairs({0,19})do for _,cooldown in ipairs({18,18*.9})do
 local h=E:create_entity('hero_zefira');h.pos={x=500,y=350};h.hero.skills.skill_b.level=1;h.main_script.insert(h,{tick_ts=born});local e=E:create_entity('enemy_bandit');e.pos={x=510,y=350};h.soldier.target_id=e.id
 local check=E:create_entity('aura_zefira_skill_b_check');check.aura.source_id=h.id;check.aura.target_id=h.id;check.cooldown=cooldown
 local store={tick_ts=born,tick_length=1/30,entities={[h.id]=h,[e.id]=e}};local events={}
 simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name}end}
 local co=coroutine.create(check.main_script.update);local frames={}
 for frame=0,1200 do store.tick_ts=born+frame/30;local ok,err=coroutine.resume(co,check,store);assert(ok,debug.traceback(co,tostring(err)));frames[#frames+1]={at=store.tick_ts,xp=h.hero.xp_queued}end
 rows[#rows+1]={born=born,cooldown=cooldown,events=events,frames=frames}
end end
P.is_node_valid=oldValid;S.queue=oldQueue
local f=assert(io.open('analysis/zefira-shield-check-oracle.json','w'));f:write(J.encode(rows));f:close();print('Native independent Zefira shield trigger traces exported')
