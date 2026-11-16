-- Controlled complete ability chain in the shipped engine; no wave/hero damage.
local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('local currentStore,activeUpdate',[[local currentStore,activeUpdate
local copiesSounds={};local Sound=require('sound_db');local oldQueue=Sound.queue
Sound.queue=function(self,name,...)copiesSounds[#copiesSounds+1]={tick=currentStore and currentStore.tick or 0,name=name};return oldQueue(self,name,...)end]])
source=source:gsub('local result={runtime=', 'local result={copiesSounds=copiesSounds,runtime=',1)
local anchor='  for _,command in ipairs(input)do if command.tick==tick then'
local at=assert(source:find(anchor,1,true))
local injected=[[
  if tick==20 then
   local enemy=E:create_entity('enemy_bandit');enemy.webCopiesTarget=true;enemy.main_script=nil;enemy.pos={x=620,y=462};enemy.motion.speed={x=0,y=0};enemy.unit.hit_offset={x=0,y=0};enemy.health.hp=10000;enemy.health.hp_max=10000;enemy.nav_path.pi=1;enemy.nav_path.spi=1;enemy.nav_path.ni=100;if arg[12]~='missing'then sim:queue_insert_entity(enemy)end
   local b=E:create_entity('bullet_skill_c_wizard_1');b.pos={x=500,y=450};b.bullet.from={x=500,y=450};b.bullet.to=table.clone(enemy.pos);b.bullet.target_id=enemy.id;b.bullet.level=tonumber(arg[11])or 1;b.bullet.damage_min=50;b.bullet.damage_max=50;sim:queue_insert_entity(b)
  end
  if tick>=40 then
   local enemy,aura;for _,e in pairs(store.entities)do if e.webCopiesTarget then enemy=e elseif e.template_name=='aura_wizard_skill_c'then aura=e end end
   if enemy then if arg[12]=='empty'then enemy.pos.x=10000;enemy.pos.y=10000 elseif aura then enemy.pos.x=aura.pos.x+20;enemy.pos.y=aura.pos.y end end
  end
]]
source=source:sub(1,at-1)..injected..source:sub(at)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
