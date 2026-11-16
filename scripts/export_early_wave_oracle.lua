EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end
love.filesystem.read=function(path)local f=assert(io.open(path));local s=f:read('*a');f:close();return s end
local W=require('wave_db');local S=require('systems');local J=require('dkjson')
assert(W:load_tsv('level01',GAME_MODE_CAMPAIGN,love.filesystem.read('reference/apk/assets/gc64/kr6/data/waves/level01_waves_campaign.tsv')))
local cmd,count=nil,0
for _,c in ipairs(W.db_cmds)do if c.name=='wave'then count=count+1;if count==2 then cmd=c;break end end end
assert(cmd)
local out={}
for _,call_time in ipairs({0,1/30,5,21.6,21.9})do
 local store={tick_length=1/30,tick_ts=0,wave_group_number=1,level_mode=GAME_MODE_CAMPAIGN,level_idx=1,player_gold=0}
 local co=coroutine.create(S.wave_spawn_tsv.cmd_fns.wave)
 for frame=0,700 do
  store.tick_ts=frame/30;store.send_next_wave=store.tick_ts>=call_time
  local ok,err=coroutine.resume(co,store,cmd);assert(ok,err)
  if coroutine.status(co)=='dead'then out[#out+1]={call_time=call_time,actual=store.tick_ts,reward=store.early_wave_reward,duration=cmd.wait_time};break end
 end
end
local fn=assert(loadfile('analysis/function-bytecode/game_gui_line7999.lua'))
local power_cases={}
for _,remaining in ipairs({0,.5,1,1.1,7,22})do
 local button={mode='cooldown',tm={start_ts=100}};fn(button,remaining)
 power_cases[#power_cases+1]={remaining=remaining,start_ts=button.tm.start_ts}
end
local f=assert(io.open('analysis/early-wave-oracle.json','w'));f:write(assert(J.encode({waves=out,powers=power_cases})));f:close()
