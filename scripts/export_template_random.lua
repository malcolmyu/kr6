TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local result={}
local function clean(value)
 if type(value)=='function'then return nil elseif type(value)~='table'then return value end
 local out={};for k,v in pairs(value)do out[k]=clean(v)end;return out
end
for _,name in ipairs({'mod_test_head_pos_kr5','mod_test_hit_pos_kr5','mod_test_mod_pos_kr5'})do result[name]=clean(E:get_template(name))end
local f=assert(io.open('public/data/template-random.json','w'));f:write(dofile('scripts/precise_json.lua')(result));f:close()

local rows={};local original=math.random
for _,roll in ipairs({.05,.5,.95,'sequence'})do
 local calls=0;math.random=function(a,b)calls=calls+1;local v=roll=='sequence'and({.11,.83,.29,.71,.43,.59,.19,.97})[(calls-1)%8+1]or roll;return a and a+math.floor(v*(b-a+1))or v end
 E:load();local templates={}
 for _,name in ipairs({'mod_test_head_pos_kr5','mod_test_hit_pos_kr5','mod_test_mod_pos_kr5'})do templates[name]=clean(E:get_template(name))end
 assert(calls==19,'unexpected template initialization draws');rows[#rows+1]={roll=roll,calls=calls,templates=templates}
end
math.random=original
local f=assert(io.open('analysis/template-random-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print('Four original template initialization traces exported')
