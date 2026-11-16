EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,S=require('entity_db'),require('dkjson'),require('systems')
local function clean(v)if type(v)=='function'then return nil elseif type(v)=='table'then local out={};for k,x in pairs(v)do out[k]=clean(x)end;return out else return v end end
local style=clean(E.entities.mod_buy_available)
local file=assert(io.open('public/data/buy-available.json','w'));file:write(J.encode(style));file:close()
local rows={}
for _,name in ipairs({'tower_holder_terrain_1_1','tower_build_catapult','tower_archers_lvl1','tower_archers_lvl3','tower_archers_lvl4','tower_wizard_lvl4','tower_knights_lvl1','tower_wizard_lvl1_stage_02'})do
 for variant=1,8 do for _,gold in ipairs({0,69,70,89,90,100,159,160,1000})do
  local t=E:create_entity(name);t.pos={x=500,y=300}
  if variant==2 then t.ui.can_click=false elseif variant==3 then t.tower.disable_spend_highlight=true elseif variant==4 then t.repair={active=true,cost=80} elseif variant==5 then t.repair={active=false,cost=80} elseif variant==6 and t.tower_holder then t.tower_holder.blocked=true;t.tower_holder.unblock_price=90 elseif variant==7 then for k,p in pairs(t.powers or{})do if k~='ultimate'then p.level=p.max_level end end end
  local m=E:create_entity('mod_buy_available');m.modifier.target_id=t.id;m.min_cost=70;m.tween.ts=2/30
  local store={tick_ts=11*(1/30),tick_length=1/30,entities={[t.id]=t,[m.id]=m},player_gold=gold,ephemeral={hide_buy_av=variant==8},level={locked_towers=variant==7 and{'tower_archers_lvl2','tower_knights_lvl2'}or{}}}
  local co=coroutine.create(m.main_script.update);local ok,err=coroutine.resume(co,m,store);assert(ok,debug.traceback(co,tostring(err)))
  rows[#rows+1]={target=clean(t),gold=gold,minCost=70,hide=variant==8,locked=store.level.locked_towers,hidden=m.render.sprites[1].hidden}
 end end
end
local pulse={}
local m=E:create_entity('mod_buy_available');m.tween.ts=2*(1/30);local store={entities={[m.id]=m}}
for tick=2,300 do local time=tick*(1/30);store.tick_ts=time;S.tween:on_update(1/30,time,store);pulse[#pulse+1]={time=time,alpha=m.render.sprites[1].alpha,scale=table.deepclone(m.render.sprites[1].scale)}end
main={params={}}
local controllers={}
for scenario=1,4 do
 local controller=E:create_entity('controller_show_buy_available');local a=E:create_entity('tower_holder_terrain_1_1');a.tower.holder_id='a';a.pos={x=200,y=200};local b=E:create_entity('tower_archers_lvl1');b.tower.holder_id='b';b.pos={x=400,y=300}
 local store={tick=0,tick_ts=0,tick_length=1/30,entities={[a.id]=a,[b.id]=b},selected_towers=scenario==4 and{'wizard','catapult'}or{'archers','wizard'},player_gold=1000,ephemeral={},level={locked_towers={}}}
 local pending,mods,created,frames={},{},{},{}
 simulation={queue_insert_entity=function(_,entity)pending[#pending+1]=entity;created[#created+1]={tick=store.tick,holder=store.entities[entity.modifier.target_id].tower.holder_id,minCost=entity.min_cost,animationTs=entity.tween.ts}end,queue_remove_entity=function()end}
 local co=coroutine.create(controller.main_script.update)
 for tick=1,100 do
  store.tick=tick;store.tick_ts=tick*(1/30)
  for _,m in ipairs(pending)do store.entities[m.id]=m;mods[#mods+1]={entity=m,co=coroutine.create(m.main_script.update)}end;pending={}
  if scenario==2 and tick==3 then controller.force_check=true end
  store.player_gold=tick<31 and 1000 or tick<61 and 0 or 100
  store.ephemeral.hide_buy_av=scenario==3 and tick>=41 and tick<70
  local ok,err=coroutine.resume(co,controller,store);assert(ok,debug.traceback(co,tostring(err)))
  for _,entry in ipairs(mods)do local ok,err=coroutine.resume(entry.co,entry.entity,store);assert(ok,debug.traceback(entry.co,tostring(err)))end
  local states={};for _,entry in ipairs(mods)do local m=entry.entity;states[#states+1]={holder=store.entities[m.modifier.target_id].tower.holder_id,hidden=m.render.sprites[1].hidden}end
  frames[#frames+1]={tick=tick,gold=store.player_gold,hide=store.ephemeral.hide_buy_av,states=states}
 end
 controllers[#controllers+1]={scenario=scenario,created=created,frames=frames}
end
file=assert(io.open('analysis/buy-available-oracle.json','w'));file:write(J.encode({rows=rows,pulse=pulse,controllers=controllers}));file:close()
print(#rows..' original buy indicator conditions and '..#pulse..' original tween samples exported')
