EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J=require('entity_db'),require('dkjson');local out={};local n=0
local af=assert(io.open('public/data/towers-art.json'));local art=J.decode(af:read('*a'));af:close()
for name,t in pairs(E.entities)do
 local components={};for _,key in ipairs({'main_script','enemy','health','death_spawns','spawner','picked_enemies','tunnel','graveyard','modifier','tower'})do local v=t[key];if v~=nil then components[key]=type(v)=='table'and{}or v end end
 if t.spawner then components.spawner.eternal=t.spawner.eternal end
 local timed=nil
 if t.timed and t.render and t.render.sprites[t.timed.sprite_id]then
  local sprite=t.render.sprites[t.timed.sprite_id]
  local a=art.animations[(sprite.prefix and(sprite.prefix..'_')or'')..sprite.name]
  timed={disabled=t.timed.disabled,duration=t.timed.duration,runs=t.timed.runs,fps=sprite.fps or 30,frames=a and(a.to-a.from+1)}
  if sprite.exo and art.exos[sprite.prefix]then
   local exo=art.exos[sprite.prefix]
   for _,animation in ipairs(exo.animations)do if animation.name==sprite.name then timed.frames=#animation.frames;timed.fps=exo.fps;break end end
  end
 end
 out[name]={timed=timed,hasEditor=t.editor~=nil,gameMode=t.editor and t.editor.game_mode,controllerT=t.controller_t,indexComponents=components};n=n+1
end
local f=assert(io.open('public/data/scene-entities.json','w'));f:write(J.encode(out));f:close();print(n..' original scene/registry component defaults exported')

local t=E.entities.background_sounds_kr5;local f=assert(io.open('public/data/background-sounds.json','w'));f:write(J.encode({min_delay=t.min_delay,max_delay=t.max_delay,sounds=t.sounds,only_on_preparation=t.only_on_preparation}));f:close()
