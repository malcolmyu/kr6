TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,S=require('entity_db'),require('dkjson'),require('sound_db');local rows={}
for _,roll in ipairs({0,.5,.999})do for _,start in ipairs({0,1,181,600})do
 local e=E:create_entity('background_sounds_kr5');e.min_delay=7;e.max_delay=13;e.sounds={'Terrain1AmbienceSoundBirds','Terrain1AmbienceSoundWind','Terrain1AmbienceSoundCicadas'}
 local store={tick_ts=0,wave_group_number=0};local removed=false;local calls=0;local events,frames={},{}
 math.random=function(a,b)calls=calls+1;if not b then b=a;a=1 end;return a+math.floor(roll*(b-a+1))end
 simulation={queue_remove_entity=function()removed=true;events[#events+1]={tick=store.tick,kind='remove'}end}
 S.queue=function(_,name)events[#events+1]={tick=store.tick,kind='sound',name=name}end
 local co=coroutine.create(e.main_script.update)
 for tick=1,1200 do store.tick=tick;store.tick_ts=tick*(1/30);store.wave_group_number=start>0 and tick>=start and 1 or 0;if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,e,store);assert(ok,debug.traceback(co,tostring(err)))end;frames[#frames+1]={tick=tick,calls=calls,removed=removed}end
 rows[#rows+1]={roll=roll,start=start,frames=frames,events=events}
end end
local f=assert(io.open('analysis/background-sounds-oracle.json','w'));f:write(J.encode(rows));f:close();print('12 original ambient sound coroutine cases /14400frames exported')
