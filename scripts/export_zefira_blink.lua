EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 7016')==0)
local E=require('entity_db');local SU=require('script_utils');local U=require('utils');local V=require('klua.vector');local J=require('dkjson');local times=J.decode(assert(io.open('public/data/zefira-exo-times.json')):read('*a'));local cases={}
for _,born in ipairs({0,19})do for _,distance in ipairs({80,160,160.01,300})do for _,level in ipairs({0,1})do
 local h=E:create_entity('hero_zefira');h.main_script.insert(h,{tick_ts=born});h.health_bar.hidden=false;h.pos={x=500,y=350};h.nav_rally.new=true;h.nav_rally.pos={x=500+distance,y=350};h.nav_grid.waypoints={};h.teleport.disabled=level==0;h.hero.skills.skill_c.level=level;h.hero.skills.skill_c.ts=born-2
 local store={tick_ts=born,tick_length=1/30,entities={[h.id]=h}};local events={};local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line7016.lua'))
 local values={U=U,S={queue=function(_,n)if n then events[#events+1]={at=store.tick_ts,sound=n}end end,stop=function()end},SU=SU,E=E,V=V,sc=h.hero.skills.skill_c,queue_insert=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name}end,y_zefira_new_rally=fn}
 for i=1,20 do local n=debug.getupvalue(fn,i);if not n then break end;assert(values[n],n);debug.setupvalue(fn,i,values[n])end
 local co=coroutine.create(fn);local frames={}
 for frame=0,220 do store.tick_ts=born+frame/30;for _,s in ipairs(h.render.sprites)do s.runs=math.floor((store.tick_ts-s.ts)/times.hero_zefiraDef[s.name]+1e-9)end
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,store,h);assert(ok,debug.traceback(co,tostring(err)))end
  local s=h.render.sprites[1];frames[#frames+1]={at=store.tick_ts,x=h.pos.x,y=h.pos.y,name=s.name,ts=s.ts,ignore=h.health.ignore_damage,hidden=h.health_bar.hidden,bans=h.vis.bans,done=coroutine.status(co)=='dead'}
 end
 cases[#cases+1]={born=born,distance=distance,level=level,frames=frames,events=events}
end end end
local f=assert(io.open('analysis/zefira-blink-oracle.json','w'));f:write(J.encode(cases));f:close();print('Native Zefira movement/teleport traces exported')
