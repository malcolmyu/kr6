EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J=require('dkjson')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/game_gui.lua 11808 11881 11731')==0)
VictoryView6={super={show=function()end}};DefeatView6={super={show=function()end}}
local cases={}
for _,kind in ipairs({'victory','defeat'})do for _,mode in ipairs({GAME_MODE_CAMPAIGN,GAME_MODE_IRON})do for stars=1,3 do
 local row={kind=kind,mode=mode,stars=stars,sounds={},nodes={},sequences={}}
 local gui={game={store={game_outcome={stars=stars},level_mode=mode}},set_mode=function()end}
 local sound={stop_all=function()row.stopAll=true end,queue=function(_,name,options)row.sounds[#row.sounds+1]={name=name,delay=options and options.delay or 0}end}
 local nodes={};local view={parent={},badges_label={'x','y'}}
 function view:ci(id)
  if not nodes[id]then nodes[id]={ci=function(self,id)return view:ci(id)end,start=function(self,name)row.sequences[self.id]=name end,focus=function()end,id=id}end
  return nodes[id]
 end
 function view:game_mode_stamp(mode,result,base)row.stamp={mode=mode,result=result,base=base or 0}end
 local fn=assert(loadfile('analysis/function-bytecode/game_gui_line'..(kind=='victory'and 11808 or 11881)..'.lua'))
 local deps={S=sound,game_gui=gui}
 for i=1,99 do local n=debug.getupvalue(fn,i);if not n then break end;if deps[n]then debug.setupvalue(fn,i,deps[n])end end
 fn(view)
 for id,n in pairs(nodes)do row.nodes[id]={hidden=n.hidden or false,animation=n.exo_animation}end
 cases[#cases+1]=row
end end end
local f=assert(io.open('analysis/outcome-ui-oracle.json','w'));f:write(assert(J.encode(cases)));f:close()

local baseCases={}
for _,noGems in ipairs({false,true})do
 local nodes={}
 local view={ci=function(self,id)if not nodes[id]then nodes[id]={}end;return nodes[id]end}
 local fade={};local deps={game_gui={game={store={gems_collected=0}}},features={no_gems=noGems},wid=function()return {}end,ktw={cancel=function()end,tween=function(_,subject,duration,target,props)fade={duration=duration,alpha=props.alpha}end},timer={script=function()end}}
 local fn=assert(loadfile('analysis/function-bytecode/game_gui_line11731.lua'))
 for i=1,99 do local n=debug.getupvalue(fn,i);if not n then break end;if deps[n]then debug.setupvalue(fn,i,deps[n])end end
 fn(view)
 baseCases[#baseCases+1]={noGems=noGems,animation=nodes.vd_exo_gems.exo_animation,labelHidden=nodes.label_gems_amount.hidden or false,fade=fade}
end
f=assert(io.open('analysis/outcome-ui-base-oracle.json','w'));f:write(assert(J.encode(baseCases)));f:close()
