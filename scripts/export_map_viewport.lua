EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local V,J=require('klua.vector'),require('dkjson');local old=IS_MOBILE;IS_MOBILE=false
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 934 969 987')==0)
local function bind(line,values)local fn=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line'..line..'.lua'));for i=1,20 do local name=debug.getupvalue(fn,i);if not name then break end;assert(values[name],name);debug.setupvalue(fn,i,values[name])end;return fn end
local limits=bind(969,{V=V,km=require('klua.macros')});local set=bind(934,{log={error=error}});local scroll=bind(987,{km=require('klua.macros')});local rows={}
for _,size in ipairs({{1365.3333333333,768},{1024,768},{1105.92,768},{1728,768},{768,768}})do for _,focus in ipairs({{524.6,662},{928.8,583.75},{631.95,532.5},{1243,669.75}})do
 local window={size={x=size[1],y=size[2]}};local puppet={size={x=2486,y=1339.5},scale={x=1,y=1},pos={x=0,y=0}};local view={forced_min_zoom=.2,zoom_range=.2,get_window=function()return window end,update_drag_limits=limits}
 set(view,puppet);puppet.pos={x=size[1]/2-focus[1]*view.zoom,y=size[2]/2-focus[2]*view.zoom};limits(view)
 local row={size=size,focus=focus,minimum=view.min_zoom,maximum=view.max_zoom,steps={}}
 local function snapshot(action)row.steps[#row.steps+1]={action=action,zoom=view.zoom,pos=table.deepclone(puppet.pos)}end
 snapshot({kind='init'})
 for _,input in ipairs({{'wu',300,200},{'wu',900,600},{'wu',0,0},{'wd',600,350},{'wd',600,350},{'wd',600,350}})do scroll(view,input[1],input[2],input[3],false);snapshot({kind='scroll',direction=input[1],point={x=input[2],y=input[3]}})end
 for _,delta in ipairs({{5000,-5000},{-10000,10000},{50,0}})do puppet.pos.x=puppet.pos.x+delta[1];puppet.pos.y=puppet.pos.y+delta[2];limits(view);snapshot({kind='pan',dx=delta[1],dy=delta[2]})end
 rows[#rows+1]=row
end end
IS_MOBILE=old;local f=assert(io.open('analysis/map-viewport-oracle.json','w'));f:write(J.encode(rows));f:close();print('200 original desktop map zoom/focus/wheel/drag states exported')
