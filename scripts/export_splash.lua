EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J=require('dkjson');local Timer=require('hump.timer')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/sequels/screen_splash.lua 426 219')==0)
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/kviews_gg.lua 1135')==0)
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/lib/klove/kui.lua 985')==0)
local function bind(fn,values)for i=1,30 do local n=debug.getupvalue(fn,i);if not n then break end;assert(values[n],n);debug.setupvalue(fn,i,values[n])end;return fn end
local timer=Timer.new();local start=bind(assert(loadfile('analysis/function-bytecode/screen_splash_line426.lua')),{timer=timer,features={}})
local fade=bind(assert(loadfile('analysis/function-bytecode/screen_splash_line219.lua')),{timer=timer})
local frame=bind(assert(loadfile('analysis/function-bytecode/kui_line985.lua')),{km=require('klua.macros'),KUI_FPS=30})
local lastFrame
local update=bind(assert(loadfile('analysis/function-bytecode/kviews_gg_line1135.lua')),{EXO={f=function(_,fn)lastFrame=fn;return{}end},log={error=error}})
local data=J.decode(assert(io.open('public/data/opening.json')):read('*a'));local count=#data.exos.SplashScreenAnimationDef.animations[1].frames
local oldKR5=IS_KR5;IS_KR5=false
local screen={overlay={hidden=true,alpha=0},fade_out=fade,done=function(self)self.finished=true end}
local self={screen=screen,exo_name='SplashScreenAnimationDef',exo_animation='idle',animations={SplashScreenAnimationDef_idle={prefix='splash',from=1,to=count,fps=30}},children={},animation_frame=frame,loop=false}
start(self)
local rows={}
local function tick(dt)timer:update(dt);update(self,dt)end
tick(2/30)
for index=0,330 do
 rows[#rows+1]={ts=self.ts,frame=lastFrame,fade=screen.overlay.alpha,done=not not screen.finished,hidden=self.hidden}
 if screen.finished then break end
 tick(1/30)
end
IS_KR5=oldKR5;assert(#rows==259 and rows[1].frame=='splash_0008'and rows[#rows].done and rows[#rows].fade==1);data.splashFrames=rows;data.splashScale=1.3
data.splashStartTs=.2
local f=assert(io.open('public/data/opening.json','w'));f:write(J.encode(data));f:close();f=assert(io.open('analysis/splash-timeline-oracle.json','w'));f:write(J.encode(rows));f:close()
print('Original SplashAnim start/update/animation_frame, 2-second hold and .33s fade exported: '..#rows..' display frames')
