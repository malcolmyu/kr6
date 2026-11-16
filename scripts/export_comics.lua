-- Run the original comic parser and timer against read-only KUI data collectors.
local J=require('dkjson');local V=require('klua.vector')
local atlas=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/comic_1.lua')
local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua')
local events={};local now=0
local previous={}
for _,name in ipairs({'klove.image_db','klove.font_db','klove.kui','kviews_gg','sound_db'})do previous[name]=package.loaded[name] end
package.loaded['klove.image_db']={};package.loaded['klove.font_db']={};package.loaded['klove.kui']={};package.loaded.kviews_gg={}
package.loaded.sound_db={queue=function(_,name)events[#events+1]={name=name,at=now}end}
local function node(size)return {size=size,pos=V.v(0,0),anchor=V.v(0,0),scale=V.v(1,1),r=0,alpha=1,colors={},children={},add_child=function(self,child)self.children[#self.children+1]=child end,update=function()end,destroy=function()end}end
KView={new=function(_,size)return node(size)end};KWindow=KView
KImageView={new=function(_,name)local frame=assert(atlas[name],name);local n=node(V.v(frame.size[1]/2,frame.size[2]/2));n.image_name=name;return n end}
GGLabel={static={},new=function(_,size)return node(size)end}
local old_translate=_;_=function(key)return strings[key] or key end
local player=dofile('reference/apk/assets/gc64/sequels/screen_comics.lua')
local function export(index)
atlas=dofile(string.format('runtime/desktop_assets/kr6-phone/images/ipadhd/comic_%d.lua',index))
events={};now=0
player.comic_data=assert(io.open(string.format('reference/apk/assets/gc64/kr6/data/comics/%02d.csv',index))):read('*a');player.level_idx=1
player:init(1365.3333333333333,768,function()events[#events+1]={name='done',at=now}end)
assert(os.execute('cp reference/apk/assets/kr6-phone/fonts/NotoSansCJKsc-Regular.otf public/fonts/')==0)
local out={entryDelay=index==2 and 1 or 0,fontScale=1.1,fps=30,width=1365.3333333333333,height=768,pages={},events=events}
local function snapshot(page)
 local result={}
 for i,s in ipairs(page.children)do result[i]={s.pos.x,s.pos.y,s.scale.x,s.scale.y,s.alpha,s.r}end
 return result
end
for i,page in ipairs(player.page_views)do
 local p={endFrame=math.floor(page.end_time*30+.5),sprites={},frames={}}
 for _,s in ipairs(page.children)do
  local labels={};for _,l in ipairs(s.children)do labels[#labels+1]={text=l.text,pos=l.pos,size=l.size,fontSize=l.font_size,align=l.text_align,rotation=l.r,color=l.colors.text}end
  p.sprites[#p.sprites+1]={id=s.id,image=s.image_name,size=s.size,anchor=s.anchor,labels=labels}
 end
 p.startFrame=math.floor(player.t*30+.5);p.frames[1]=snapshot(page)
 while player.playing do now=now+1/30;player:update(1/30);p.frames[#p.frames+1]=snapshot(page) end
 out.pages[#out.pages+1]=p
 player:do_next_page()
end
local frames={};for _,p in ipairs(out.pages)do for _,s in ipairs(p.sprites)do frames[s.image]=atlas[s.image]end end
local f=assert(io.open('analysis/power-icons.json','w'));f:write(assert(J.encode(frames)));f:close();assert(os.execute('python3 scripts/export_gui_icons.py')==0)
f=assert(io.open(string.format('public/data/comic%02d.json',index),'w'));f:write(assert(J.encode(out)));f:close()
player:destroy()
return out
end
local opening=export(1);local ending=export(2)
atlas=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/comic_1.lua')
player.comic_data=assert(io.open('reference/apk/assets/gc64/kr6/data/comics/01.csv')):read('*a')
local controls={}
player:init(1365.3333333333333,768,function()end)
for _,action in ipairs({{'skip'},{'advance',.4},{'skip'},{'advance',.2},{'skip'},{'skip'},{'advance',.1},{'advance',.15},{'advance',.1},{'skip'},{'skip'},{'advance',.25}})do
 if action[1]=='skip'then player:skip()else player:update(action[2])end
 controls[#controls+1]={action=action,page=player.current_page_id,playing=player.playing,skipping=player.skipping or false,finishing=player.finishing or false,alpha=player.current_page.alpha}
end
local f=assert(io.open('analysis/comic-control-oracle.json','w'));f:write(assert(J.encode(controls)));f:close()
player:destroy();_=old_translate
for name,value in pairs(previous)do package.loaded[name]=value end
print('Original comic pages exported: '..(#opening.pages+#ending.pages))
