EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local rows={}
for _,c in ipairs({{name='normal',present=true,bans=0,hp=30},{name='physical-ban',present=true,bans=1,hp=30},{name='ranged-ban',present=true,bans=2,hp=30},{name='both-bans',present=true,bans=3,hp=30},{name='all-bans',present=true,bans=4294967295,hp=30},{name='absent',present=false,bans=0,hp=30},{name='dead-present',present=true,bans=0,hp=0,dead=true},{name='dead-banned',present=true,bans=2,hp=0,dead=true},{name='high-bit',present=true,bans=2147483648,hp=30},{name='retiring-present',present=true,bans=0,hp=0,dead=false}})do
 local target=E:create_entity('enemy_bandit');target.vis.bans=c.bans;target.health.hp=c.hp;target.health.dead=c.dead
 local e=E:create_entity('bullet_zefira');e.pos={x=10,y=20};e.bullet.from=table.clone(e.pos);e.bullet.to={x=70,y=100};e.bullet.target_id=target.id
 local store={entities={},tick_ts=42.25};if c.present then store.entities[target.id]=target end
 local accepted=e.main_script.insert(e,store,{})
 rows[#rows+1]={case=c,accepted=accepted,pos=table.clone(e.pos),rotation=e.render.sprites[1].r,clock=store.tick_ts,sound=e.sound_events and e.sound_events.insert,speed=table.clone(e.bullet.speed)}
end
local f=assert(io.open('analysis/hero-bolt-insert-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print('Original hero bolt insert '..#rows..' cases exported')
