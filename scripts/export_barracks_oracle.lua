EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local U=require('utils'); local E=require('entity_db'); local json=require('dkjson')
local formations,slots,damage={},{},{}
local tower=E:create_entity('tower_knights_lvl1')
tower.barrack.rally_pos={x=800,y=350}
for count=1,3 do
  for index=1,count do
    for _,angle in ipairs({0,.5}) do
      local pos,center=U.rally_formation_position(index,tower.barrack,count,angle)
      formations[#formations+1]={index=index,count=count,angle=angle,rally=tower.barrack.rally_pos,radius=tower.barrack.rally_radius,pos=pos,center=center}
    end
  end
end
local soldier=E:create_entity('soldier_knights_lvl1')
local enemy=E:create_entity('enemy_bandit')
enemy.pos={x=750,y=360};enemy.heading={angle=0}
for _,angle in ipairs({0,math.pi/2,math.pi,math.pi*1.5}) do
  enemy.heading.angle=angle
  for index=1,3 do
    local pos,left=U.melee_slot_position(soldier,enemy,index)
    slots[#slots+1]={index=index,angle=string.format('%.17g',angle),enemy=enemy.pos,enemyOffset=enemy.enemy.melee_slot,offset=soldier.soldier.melee_slot_offset,pos=pos,left=left}
  end
end
for _,kind in ipairs({DAMAGE_PHYSICAL,DAMAGE_MAGICAL,DAMAGE_EXPLOSION,DAMAGE_TRUE}) do
  for value=1,30 do
    soldier.health.hp=40
    local d={value=value,damage_type=kind,reduce_armor=0,reduce_magic_armor=0}
    damage[#damage+1]={health=soldier.health,damage=d,expected=U.predict_damage(soldier,d)}
  end
end
local f=assert(io.open('analysis/barracks-oracle.json','w')); f:write(assert(json.encode({formations=formations,slots=slots,damage=damage})));f:close()
