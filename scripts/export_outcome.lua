local J=require('dkjson');local V=require('klua.vector');local km=require('klua.macros');local log=require('klua.log'):new('web-outcome-export')
local Timer=require('hump.timer');local Tween=require('klove.tween')
local gui=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/gui_common.lua')
local aliases={};for _,f in pairs(gui)do for _,a in ipairs(f.alias or {})do aliases[a]=f end end;for a,f in pairs(aliases)do gui[a]=f end
ctx={sw=1365.3333333333333,sh=768};v=V.v;r=V.r
local template=dofile('reference/apk/assets/gc64/kr6/data/kui_templates/victory_defeat_kui.lua')
local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua')
local out={noGems=true,template=template,scale=.8,width=ctx.sw,height=ctx.sh,images={},atlas={},textures={},exos={},timelines={}}
local frames,textures={},{}
local function add(name)
 if not name then return end
 local f=assert(gui[name],name);out.atlas[name]=f;textures[f.a_name]=true;out.images[name]={x=f.size[1]/2,y=f.size[2]/2};frames[name]=f
end
local function visit(n)
 for _,key in ipairs({'image_name','default_image_name','focus_image_name','false_image_name','true_image_name'})do add(n[key])end
 if n.text_key then n.text=strings[n.text_key]or n.text end
 if n.exo_name then
  local e=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/'..n.exo_name..'.exo3');out.exos[n.exo_name]=e
  for _,p in ipairs(e.parts)do add(p[1])end
 end
 for _,c in ipairs(n.children or {})do visit(c)end
end
visit(template)
for _,index in ipairs({1,3,6})do add(string.format('victory_defeat_mode_badges_%04d',index))end
for name in pairs(textures)do out.textures[#out.textures+1]=name;assert(os.execute('cp runtime/desktop_assets/kr6-phone/images/ipadhd/'..name..' public/assets/')==0)end
local f=assert(io.open('analysis/power-icons.json','w'));f:write(assert(J.encode(frames)));f:close();assert(os.execute('python3 scripts/export_gui_icons.py')==0)
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/kviews_gg.lua 1437 1461 1482 1574 1669')==0)
local functions={};local deps={V=V,km=km,log=log}
for name,line in pairs({initialize=1437,reset=1461,start=1482,update=1574,do_row=1669})do
 local fn=assert(loadfile('analysis/function-bytecode/kviews_gg_line'..line..'.lua'))
 -- Extracted prototypes are standalone functions, not modules.
 for i=1,99 do local up=debug.getupvalue(fn,i);if not up then break end;if deps[up]then debug.setupvalue(fn,i,deps[up])end end
 functions[name]=fn
end

KView={initialize=function()end}
local function find(n,id)
 if n.id==id then return n end
 for _,c in ipairs(n.children or {})do local result=find(c,id);if result then return result end end
end
local function new_node(tt,window)
 local n=table.deepclone(tt);n.pos=n.pos or V.v(0,0);n.scale=n.scale or V.v(1,1);n.alpha=n.alpha or 1;n.r=n.r or 0;n.ts=0
 n.ci=find;n.get_window=function()return window end
 local children={};for _,c in ipairs(n.children or {})do children[#children+1]=new_node(c,window)end;n.children=children
 n.update=function(self,dt)self.ts=self.ts+dt;for _,c in ipairs(self.children)do c:update(dt)end end
 if n.class=='GGTimeline'then for name,fn in pairs(functions)do n[name]=fn end;n:initialize(n.size)end
 return n
end
local function snapshot(n,result)
 if n.id then result[n.id]={n.pos.x,n.pos.y,n.scale.x,n.scale.y,n.alpha,n.r,n.hidden or false}end
 for _,c in ipairs(n.children)do snapshot(c,result)end
end
for _,tt in ipairs(template.children)do if tt.class=='GGTimeline'then
 out.timelines[tt.id]={}
 for _,seq in ipairs(tt.sequences)do
  local timer=Timer.new();local window={ktw=Tween.new(timer)};local n=new_node(tt,window)
  n:start(seq.name);if seq.name:match('_loop$')then n.play='loop'end
  local trace={};for frame=0,200 do
   local row={};snapshot(n,row);trace[#trace+1]=row
   timer:update(1/30);n:update(1/30)
  end
  out.timelines[tt.id][seq.name]=trace
 end
end end
f=assert(io.open('public/data/outcome.json','w'));f:write(assert(J.encode(out)));f:close()
print('Native outcome template, EXOs and timeline traces exported')
