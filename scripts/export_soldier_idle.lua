TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU=require('entity_db'),require('script_utils');local encode=dofile('scripts/precise_json.lua');local rows={}
for _,name in ipairs({'hero_gerald','hero_zefira','soldier_knights_lvl1'})do for _,birth in ipairs({0,19,827})do for _,roll in ipairs({.05,.4,.5,.95,'sequence'})do for _,scenario in ipairs({'continuous','gap2','gap3','stunned','forced','variants','nonloop'})do
 local e=E:create_entity(name);e.render.sprites[1].ts=-.27;e.render.sprites[1].flip_x=false;e.idle_flip.ts=birth*(1/30)
 if scenario=='variants'then e.idle_flip.cooldown=3/30;e.idle_flip.animations={'idle','walking','other'}elseif scenario=='nonloop'then e.idle_flip.loop=1 end
 local config=table.deepclone(e.idle_flip);local calls=0
 math.random=function(a,b)calls=calls+1;local v=roll=='sequence'and({.11,.83,.29,.71,.43,.59,.19,.97})[(calls-1)%8+1]or roll;if a==nil then return v elseif b==nil then return 1+math.floor(v*a)else return a+math.floor(v*(b-a+1))end end
 local frames={}
 for relative=1,360 do local tick=birth+relative;local time=tick*(1/30);local active=not(scenario=='gap2'and(relative%70==0)or scenario=='gap3'and(relative%70==0 or relative%70==1));e.unit.is_stunned=scenario=='stunned'and relative>=100 and relative<=180
  if active then SU.soldier_idle({tick_ts=time,tick_length=1/30},e,scenario=='forced')end
  local s=e.render.sprites[1];frames[#frames+1]={tick=tick,active=active,stunned=e.unit.is_stunned,animation=s.name,at=s.ts,loop=s.loop==true or s.loop==-1,flip=s.flip_x,calls=calls,state=table.deepclone(e.idle_flip)}
 end
 rows[#rows+1]={name=name,birth=birth,roll=roll,scenario=scenario,config=config,frames=frames}
end end end end
local f=assert(io.open('analysis/soldier-idle-oracle.json','w'));f:write(encode(rows));f:close();print(#rows..' original soldier_idle traces exported')
