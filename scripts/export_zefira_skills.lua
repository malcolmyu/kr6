EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 6264')==0)
local E=require('entity_db');local SU=require('script_utils');local U=require('utils');local J=require('dkjson');local P=require('path_db');local oldValid=P.is_node_valid;P.is_node_valid=function()return true end
local oldRandom=math.random;math.random=function(a,b)if a and b then return math.floor((a+b)/2)else return .5 end end
local exos={};for file in io.popen('find reference/apk/assets/gc64/kr6/data/exoskeletons/go_hero_zefira -name "*.exo3"'):lines()do local e=dofile(file);local d={};for _,a in ipairs(e.animations)do d[a.name]=#a.frames/e.fps end;exos[file:match('([^/]+)%.exo3$')]=d end
local A={}
for level=1,3 do for _,flip in ipairs({false,true})do
 local h=E:create_entity('hero_zefira');h.hero.skills.skill_a.level=level;h.melee.attacks[2].disabled=false;h.melee.attacks[2].damage_min=({20,50,80})[level];h.melee.attacks[2].damage_max=({40,70,100})[level];h.pos={x=500,y=350};h.motion.arrived=true
 local store={tick_ts=13,tick_length=1/30,entities={},damage_queue={}};h.main_script.insert(h,store);store.entities[h.id]=h
 local targets={};for index,offset in ipairs({{0,0},{50,0},{50.01,0},{0,35},{0,35.01},{-40,-10}})do local e=E:create_entity('enemy_bandit');e.pos={x=500+(flip and-40 or 40)+offset[1],y=350+offset[2]};e.health.hp=1000;store.entities[e.id]=e;targets[e.id]={offset=offset,name=e.template_name};if index==1 then h.soldier.target_id=e.id end end
 local crow=E:create_entity('enemy_crow');crow.pos={x=500+(flip and-40 or 40),y=350};crow.health.hp=1000;store.entities[crow.id]=crow;targets[crow.id]={offset={0,0},name='enemy_crow'}
 local target=store.entities[h.soldier.target_id];local effects={};simulation={queue_insert_entity=function(_,e)effects[#effects+1]={at=store.tick_ts,name=e.template_name,pos=e.pos and table.deepclone(e.pos),target=e.modifier and targets[e.modifier.target_id]}end}
 local original=E:get_template('hero_zefira').main_script.update;local helper
 for i=1,25 do local n,v=debug.getupvalue(original,i);if n=='y_hero_melee_block_and_attacks'then helper=v;break end end
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6264.lua'));local stubSU=setmetatable({soldier_pick_melee_target=function()return target end,soldier_move_to_slot_step=function()return false end},{__index=SU})
 for i=1,30 do local n,v=debug.getupvalue(helper,i);if not n then break end;if n=='SU'then v=stubSU end;debug.setupvalue(fn,i,v)end
 local co=coroutine.create(fn);local frames={}
 for frame=0,65 do store.tick_ts=13+frame/30;local s=h.render.sprites[1];s.runs=math.floor((store.tick_ts-s.ts)/exos.hero_zefiraDef[s.name]+1e-9)
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,store,h);assert(ok,debug.traceback(co,tostring(err)))end
  frames[#frames+1]={at=store.tick_ts,name=s.name,ts=s.ts,xp=h.hero.xp_queued,cooldownTs=h.melee.attacks[2].ts,done=coroutine.status(co)=='dead'}
 end
 local damage={};for _,d in ipairs(store.damage_queue)do damage[#damage+1]={target=targets[d.target_id],value=d.value,type=d.damage_type}end
 A[#A+1]={level=level,flip=flip,frames=frames,damage=damage,effects=effects}
end end
math.random=oldRandom;P.is_node_valid=oldValid
local f=assert(io.open('analysis/zefira-hammer-oracle.json','w'));f:write(J.encode(A));f:close();f=assert(io.open('public/data/zefira-exo-times.json','w'));f:write(J.encode(exos));f:close();print('Native Zefira hammer traces exported')
