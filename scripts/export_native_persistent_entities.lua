EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local S,SSO,J=require('systems'),require('klove.sso'),require('dkjson')
local output={}
local function snapshot()
 local out={};for name,list in pairs(SSO.persistent_lists)do local entries={};for id,e in pairs(list)do entries[#entries+1]=id end;out[name]=entries end;return out
end
local kinds={
 {key='plain'}, {key='enemy',main_script={},enemy={},health={}}, {key='dead',main_script={},enemy={},health={dead=true}},
 {key='deathSpawn',main_script={},enemy={},death_spawns={}}, {key='spawner',main_script={},spawner={eternal=true}},
 {key='finiteSpawner',main_script={},spawner={eternal=false}}, {key='picked',main_script={},picked_enemies={}},
 {key='tunnel',main_script={},tunnel={}}, {key='noScriptEnemy',enemy={},health={}}, {key='noScriptTunnel',tunnel={}},
 {key='scriptOnly',main_script={}}, {key='tower',tower={}}, {key='graveyard',graveyard={}}, {key='modifier',modifier={}},
 {key='all',main_script={},enemy={},health={},tower={},graveyard={},modifier={}},
 {key='zeroIsTruthy',main_script=0,enemy=0,health=0,tower=0,modifier=0,graveyard=0},
 {key='falseIsNotTruthy',main_script=false,enemy={},health={},tower=false,modifier=false,graveyard=false},
 {key='faerie',main_script={},template_name='nav_faerie'},
}
for _,isKr3 in ipairs({false,true})do for _,stride in ipairs({1,7,257})do
 IS_KR3=isKr3;S.sso_post:init({});local steps,known={},{}
 local function act(op,e)
  S.sso_post[op=='insert'and'on_insert'or'on_remove'](S.sso_post,e,{})
  steps[#steps+1]={op=op,entity=table.deepclone(e),lists=snapshot()}
 end
 for index,kind in ipairs(kinds)do local e=table.deepclone(kind);e.id=index*stride;known[index]=e;act('insert',e)end
 -- Writes to absent keys and delayed reinsertions alter Lua hash structure.
 for index=#kinds,1,-2 do act('remove',known[index])end
 for index=1,#kinds,3 do act('remove',known[index]);act('insert',known[index])end
 for index=19,60 do local e={id=index*stride,main_script={},tower={},modifier={}};act('remove',e);if index%2==0 then e.enemy={};e.health={};act('insert',e)end end
 output[#output+1]={isKr3=isKr3,stride=stride,steps=steps}
end end
local f=assert(io.open('analysis/native-persistent-entities-oracle.json','w'));f:write(J.encode({runtime=jit.version,rows=output}));f:close()
print('Original sso_post persistent list insertion/removal traces exported')
