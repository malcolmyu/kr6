import {readFileSync}from'node:fs'
import assert from'node:assert/strict'
import {HeroRangedCombat}from'../src/game/HeroRangedCombat.ts'
import {HomingBoltMotion}from'../src/game/HomingBoltMotion.ts'
const templates=JSON.parse(readFileSync('public/data/entities.json')),rows=JSON.parse(readFileSync('analysis/hero-bolt-insert-oracle.json'))
for(const row of rows){
 const c=row.case,sounds=[];let calls=0
 const s=new HeroRangedCombat(templates,()=>{calls++;return .5},()=>{})
 s.onSound=name=>sounds.push(name)
 const target={hp:c.hp,template:{...templates.enemy_bandit,vis:{...templates.enemy_bandit.vis,bans:c.bans}}},p={id:-1,name:'bullet_zefira',born:42,queuedAt:42,pos:{x:10,y:20},to:{x:70,y:100},rotation:0,target,tracking:true,motion:new HomingBoltMotion(templates.bullet_zefira.bullet),damage:[8,8]}
 s.queuedProjectiles.push(p)
 assert.equal(s.insertProjectile(p,42.25,c.present),row.accepted,c.name)
 assert.equal(s.queuedProjectiles.length,0,c.name+'/queue consumed');assert.equal(s.projectiles.length,row.accepted?1:0,c.name+'/accepted collection');assert.equal(calls,0)
 assert.deepEqual(sounds,row.accepted&&row.sound?[row.sound]:[])
 if(row.accepted){assert.deepEqual(p.pos,row.pos);assert.equal(p.born,row.clock);assert.equal(p.rotation,row.rotation)}
 s.beginTick(42.25+1/30);assert.equal(s.projectiles.length,row.accepted?1:0,c.name+'/no delayed rejection leak')
}
assert.equal(rows.length,10)
console.log('Ten original hero bolt insertion cases match captured-target presence, ranged/physical/high/all bans and dead/retiring targets; rejected queues produce no projectile, sound or later insertion.')
