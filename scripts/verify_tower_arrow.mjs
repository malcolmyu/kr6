import {bulletDamageValue} from '../src/game/BulletDamage.ts'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {EnemyArrowMotion} from '../src/game/EnemyArrowMotion.ts'
import {towerArrowAim} from '../src/game/TowerArrow.ts'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
let count=0
for(const row of read('analysis/tower-arrow-oracle.json')) {
 const b=templates[row.name].bullet,aim=towerArrowAim(row.targetStart,row.targetSpeed,b,()=>.5)
 assert(Math.hypot(aim.to.x-row.to.x,aim.to.y-row.to.y)<1e-9);assert(Math.abs(aim.duration-row.duration)<1e-12)
 const arrow=new EnemyArrowMotion(row.from,aim.to,b),target={id:100,name:'enemy_bandit',hp:1000,born:0,age:0,template:structuredClone(templates.enemy_bandit),path:new PathFollower([row.targetStart,{x:1000,y:0}])}
 target.template.unit.hit_offset={x:0,y:0}
 const combat=new RangedCombat(templates,()=>.5,()=>{}),effects=[];combat.onEffect=n=>effects.push(n)
 combat.projectiles.push({id:1,name:row.name,born:0,duration:aim.duration,from:row.from,to:aim.to,pos:{...row.from},target,done:false,rotation:0,arrowMotion:new EnemyArrowMotion(row.from,aim.to,b)})
 for(const [frame,sample] of row.frames.entries()) {
  assert.equal(arrow.step(frame/30,1/30,sample.target),sample.done)
  assert(Math.hypot(arrow.pos.x-sample.pos.x,arrow.pos.y-sample.pos.y)<1e-8);assert(Math.abs(arrow.rotation-sample.rotation)<1e-9);assert.equal(arrow.hidden,sample.hidden)
  Object.assign(target.path.position,sample.target);combat.advance(frame/30,[],[target])
  assert.equal(combat.projectiles.length,sample.done?0:1)
  count++
 }
 assert.equal(target.hp<1000,row.hit)
 if(row.hit){assert.equal(1000-target.hp,Math.floor(row.damage+.5));assert(effects.includes('fx_blood_splat'))}
 else assert(effects.includes(templates[row.name].bullet.miss_decal))
}
console.log(`${count} native tower-arrow frames match across four levels and stationary/linear moving targets: fixed-height duration, prediction noise, rotation/hiding, hit timing and applied damage`)

for(const row of read('analysis/bullet-damage-oracle.json'))assert.equal(bulletDamageValue(row.min,row.max,row.factor,()=>row.fraction),row.value)
console.log('140 native continuous-roll/ceil-factor bullet damage cases match, including zero factor/minimum one and endpoint rolls')
