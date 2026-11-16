import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {archerGeometry} from '../src/game/ArcherShooter.ts'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
for(const row of read('analysis/archers-shooter-oracle.json')) {
 const t=templates[`tower_archers_lvl${row.level}`],target={x:500+row.offset[0],y:350+row.offset[1]},f=archerGeometry({x:500,y:350},t,row.sid,target)
 assert.equal(f.back,row.initial.name==='shootback');assert.equal(f.flipX,row.initial.flip);assert.deepEqual(f.from,row.shot.from)
 if(row.initial.bowHidden!==undefined)assert.equal(f.back,row.initial.bowHidden)
}
let shots=0
for(const row of read('analysis/archers-cycle-oracle.json')) {
 const tower=`tower_archers_lvl${row.level}`,site={id:'test',tower,pos:{x:500,y:350}},enemy={id:1,name:'enemy_bandit',born:0,age:0,hp:100000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:600,y:400},{x:1000,y:400}])}
 enemy.template.motion.max_speed=0
 const combat=new RangedCombat(templates,()=>.5,()=>{}),casts=[]
 combat.onQueueProjectile=(shot,name,time)=>casts.push({at:time,from:shot.from})
 for(let frame=0;frame<=180;frame++) {
  combat.advance(frame/30,[site],[enemy])
 }
 assert.equal(casts.length,row.shots.length)
 for(const [i,expected] of row.shots.entries()) {assert(Math.abs(casts[i].at-expected.at)<1e-10,`${row.level} shot ${i} at ${casts[i].at} expected ${expected.at}`);assert.deepEqual(casts[i].from,expected.from);shots++}
}
console.log(`60 native shooter direction/bow/origin cases and ${shots} native continuous fire events match: independent 1/2/3/4-shooter rotation, spawn delay and cooldown boundaries`)
