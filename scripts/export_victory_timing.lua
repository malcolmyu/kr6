EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/game_gui.lua 1131 4163')==0)
local rows={};local J=require('dkjson')
for _,scenario in ipairs({'ordinary','reduced','instant','stale'})do
 local time,events,jobs=0,{},{};local function event(name)events[#events+1]={at=time,name=name}end
 local store={restart_count=1,game_outcome={stars=1}};if scenario=='reduced'then store.custom_game_outcome={next_item_name='tutorial_end',after_victory_screen=true}elseif scenario=='instant'then store.custom_game_outcome={next_item_name='level_04_end',after_victory_screen=true}end
 local gui={game={store=store},store_xp=function()event('store-xp')end,c_deselect=function()event('deselect')end,set_mode=function()event('disable-input')end,hide_gui_hud=function()event('hide-hud')end,window={set_responder=function()event('responder')end}}
 local show=assert(loadfile('analysis/function-bytecode/game_gui_line4163.lua'));local bindings={game_gui=gui,wid=function(name)if name=='popup_ingame_options'then return{hidden=true}else return{show=function()event('show-victory')end}end end}
 for i=1,20 do local name=debug.getupvalue(show,i);if not name then break end;local value=assert(bindings[name],name);debug.setupvalue(show,i,value)end;gui.c_show_victory=function()show();event('pause-world');assert(store.paused)end
 local signal=assert(loadfile('analysis/function-bytecode/game_gui_line1131.lua'));bindings={game_gui=gui,storage={load_slot=function()return{}end},timer={after=function(_,delay,fn)jobs[#jobs+1]={at=time+delay,fn=fn}end}}
 for i=1,20 do local name=debug.getupvalue(signal,i);if not name then break end;local value=assert(bindings[name],name);debug.setupvalue(signal,i,value)end
 signal();if scenario=='stale'then store.restart_count=2 end
 for tick=0,150 do time=tick/30;for _,job in ipairs(jobs)do if not job.done and time>=job.at then job.done=true;job.fn()end end end
 rows[#rows+1]={scenario=scenario,events=events}
end
local f=assert(io.open('analysis/victory-timing-oracle.json','w'));f:write(assert(J.encode(rows)));f:close();local a=rows[1].events;local result={};for _,e in ipairs(a)do if e.name=='hide-hud'then result.hideHud=e.at elseif e.name=='show-victory'then result.show=e.at end end;assert(result.hideHud and result.show);local out=assert(io.open('public/data/outcome-timing.json','w'));out:write(assert(J.encode(result)));out:close();print('Original victory signal and show callbacks:3s hide,4s pause/show; reduced/instant/restart guard traced')
