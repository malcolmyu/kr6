EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local P,G,J=require('path_db'),require('grid_db'),require('dkjson');local V=require('klua.vector')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 20167')==0)
local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line20167.lua'));local get=P.get_all_valid_pos;local oldRandom=math.random;local rows={}
for stage=1,3 do
 local name=string.format('level%02d',stage);G:load(name);P:load(name,{left=-512/3,right=1024+512/3,bottom=0,top=768})
 local level=J.decode(assert(io.open('public/data/'..name..'.json')):read('*a'))
 for _,site in ipairs(level.data.entities_list)do if site.pos and(site.template:match('^tower_holder')or site.template:match('^tower_.*_stage_'))then for scenario=1,3 do for _,rng in ipairs({0,.5,.999})do
  local mines=scenario==1 and{}or scenario==2 and{{pos={x=site.pos.x+50,y=site.pos.y}}}or{{pos={x=site.pos.x,y=site.pos.y}},{pos={x=site.pos.x-50,y=site.pos.y}}}
  local candidates;P.get_all_valid_pos=function(self,...)local result=get(self,...);candidates=table.deepclone(result);return result end
  math.random=function(a,b)return a+math.floor(rng*(b-a+1))end
  local bindings={sca={min_dist_between_traps=50,max_range=120},P=P,this={pos=site.pos},V=V}
  for i=1,20 do local n=debug.getupvalue(fn,i);if not n then break end;assert(bindings[n],n);debug.setupvalue(fn,i,bindings[n])end
  local selected=fn(mines)
  rows[#rows+1]={stage=stage,pos=site.pos,mines=mines,rng=rng,candidates=candidates,selected=selected}
 end end end end
end
P.get_all_valid_pos,math.random=get,oldRandom
local f=assert(io.open('analysis/catapult-trap-positions-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original trap position cases across three native maps, all subpaths/terrain/visible-node checks')
