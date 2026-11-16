EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local SU=require('script_utils');local J=require('dkjson');local cases={}
for _,stunFrame in ipairs({5,8,14})do
 local e=E:create_entity('enemy_bandit');local h=E:create_entity('soldier_knights_lvl1');e.pos={x=500,y=350};h.pos={x=530,y=350};e.melee.order={1};e.melee.attacks[1].ts=-10;e.enemy.blockers={h.id}
 local store={tick_ts=0,tick_length=1/30,entities={[e.id]=e,[h.id]=h},damage_queue={}};local co=coroutine.create(SU.y_enemy_melee_attacks);local frames={}
 for frame=0,30 do store.tick_ts=frame/30;if frame==stunFrame then SU.stun_inc(e)end
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,store,e,h);assert(ok,debug.traceback(co,tostring(err)))end
  frames[#frames+1]={at=store.tick_ts,damage=#store.damage_queue,done=coroutine.status(co)=='dead'}
 end
 cases[#cases+1]={stunFrame=stunFrame,frames=frames}
end
local f=assert(io.open('analysis/zefira-stun-interrupt-oracle.json','w'));f:write(J.encode(cases));f:close();print('Native stun/attack interruption traces exported')
