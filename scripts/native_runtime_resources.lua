-- Metadata-only resources for executing shipped logic/render-update clocks.
-- No GPU image/shader/audio playback is supplied or visually verified here.
return function(level,slot)
 local A,I,EXO=require('klove.animation_db'),require('klove.image_db'),require('exoskeleton')
 local quote=function(value)return"'"..value:gsub("'","'\\''").."'"end
 love.filesystem.isDirectory=function(path)local p=io.popen('find '..quote(path)..' -maxdepth 0 -type d 2>/dev/null');local yes=p:read('*l')~=nil;p:close();return yes end
 love.filesystem.getDirectoryItems=function(path)
  if not love.filesystem.isDirectory(path)then return{}end
  local p=io.popen('ls -1 '..quote(path));local rows={};for name in p:lines()do rows[#rows+1]=name end;p:close();return rows
 end
 local groups={'go_decals','go_enemies_common','go_towers','go_commons'}
 local function add(name)if not table.contains(groups,name)then groups[#groups+1]=name end end
 for _,name in ipairs(level.required_textures or{})do add(name)end
 for _,name in ipairs(slot.heroes.team)do add('go_'..name)end
 for _,name in ipairs(slot.towers.selected)do add('go_towers_'..name)end
 for _,name in ipairs(slot.powers.selected)do add('go_power_'..name)end
 I.last_preloaded_group_names=groups
 -- Keep the original synthetic default-atlas metadata and reference scale.
 love.image={newImageData=function()return{setPixel=function()end}end}
 love.graphics.newImage=function()return{getDimensions=function()return 1,1 end}end
 love.graphics.newQuad=function()return{}end
 I:load_default_atlas()
 local atlas=I.db_atlas;local absent={}
 for _,group in ipairs(groups)do
  local path='runtime/desktop_assets/kr6-phone/images/ipadhd/'..group..'.lua'
  if love.filesystem.isFile(path)then
   for name,frame in pairs(dofile(path))do atlas[name]=frame;for _,alias in ipairs(frame.alias or{})do atlas[alias]=frame end end
  end
 end
 I.db_atlas=atlas
 I.s=function(_,name)
  local frame=atlas[name]
  if not frame then absent[name or'<nil>']=true;return nil end
  return {webName=name,size=frame.size,trim=frame.trim,ref_scale=frame.ref_scale or .5}
 end
 return {A=A,I=I,EXO=EXO,groups=groups,missing=absent}
end
