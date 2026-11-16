TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local E,P,J=require('entity_db'),require('path_db'),require('dkjson');local rows={}
for stage=1,3 do
 require('grid_db'):load('level0'..stage)
 P:load('level0'..stage,{left=-512/3,right=1024+512/3,bottom=0,top=768})
 for _,pos in ipairs({{x=500,y=350},{x=600,y=250},{x=-100,y=320},{x=740,y=420},{x=530,y=680}})do for level=1,3 do for _,roll in ipairs({.05,.5,.8,.95})do
  local h=E:create_entity('controller_tower_wizard_book_bounce');h.pos=table.clone(pos);h.aura.level=level;local calls,events=0,{};local store={tick_ts=19*TICK_LENGTH,tick_length=TICK_LENGTH}
  math.random=function(a,b)calls=calls+1;return a and a+math.floor(roll*(b-a+1))or roll end
  simulation={queue_insert_entity=function(_,b)events[#events+1]={name=b.template_name,from=table.clone(b.bullet.from),to=table.clone(b.bullet.to),level=b.bullet.level,calls=calls}end,queue_remove_entity=function()events[#events+1]={remove=true,calls=calls}end}
  local co=coroutine.create(h.main_script.update);local ok,err=coroutine.resume(co,h,store);assert(ok,debug.traceback(co,tostring(err)));assert(coroutine.status(co)=='dead')
  rows[#rows+1]={stage=stage,pos=pos,level=level,roll=roll,events=events}
 end end end
end
local f=assert(io.open('analysis/wizard-copies-bounce-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original book bounce/nearest-path cases')
