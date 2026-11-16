import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
let frames=0
for(const row of read('analysis/zefira-critical-oracle.json')){
 const b=new BarracksCombat(templates,()=>row.roll,()=>{}),heroes=new HeroSystem(templates,b,()=>row.roll),h=heroes.insert('hero_zefira',{x:500,y:350},0),r=heroes.ranged
 const e={id:999,name:'enemy_bandit',hp:1000,frozen:true,path:new PathFollower([{x:row.kind==='melee'?530:620,y:350},{x:900,y:350}]),template:structuredClone(templates.enemy_bandit)}
 h.template.unit.damage_factor=row.mode==='base'?1:1.3;h.template.melee.attacks[0].critical_chance=.2;h.rangedCriticalChance=.2;h.readyAt=-9
 const events=[],damage=[];let time,previous=e.hp,finished=false
 r.onQueueProjectile=p=>{events.push({at:time,name:p.name,pos:{...p.pos},factor:p.damageFactor,pop:p.pop})}
 for(const [frame,sample]of row.frames.entries()){
  time=frame/30
  if(row.mode==='blink-expires'&&frame===6)h.template.unit.damage_factor/=1.3
  if(frame===row.cancelFrame){if(row.kind==='ranged')r.requestInterrupt(h);else{h.attack=undefined;finished=true}}
  if(row.kind==='ranged'){
   r.advance(time,1/30,[h],[e]);if(sample.done)h.scriptLocked=true
   assert.equal(!r.isAttacking(h),sample.done)
  }else{
   b.advanceCriticals(time);if(!finished)b.soldierAttack(h,e,time)
   if(e.hp!==previous){damage.push(previous-e.hp);previous=e.hp}
   assert.deepEqual(damage,sample.damage.map(d=>d.value),`${row.kind}/${row.mode}/${row.roll}/${row.cancelFrame} at ${time}`)
   if(sample.done)finished=true
  }
  assert(Math.abs(h.template.unit.damage_factor-sample.factor)<1e-10,`${row.kind}/${row.mode}/${row.roll}/${row.cancelFrame} at ${time} factor`);frames++
 }
 if(row.kind==='ranged'){
  assert.equal(events.length,row.events.length)
  for(const [i,e]of events.entries()){const n=row.events[i];assert(Math.abs(e.at-n.at)<1e-8);assert.deepEqual(e.pos,n.pos);assert(Math.abs(e.factor-n.factor)<1e-10);assert.deepEqual(e.pop,n.pop)}
 }
}
for(const row of read('analysis/damage-pops-oracle.json')){
 let calls=0;const d=new DodgeSystem(()=>{calls++;return row.roll},templates),hero={pos:{x:500,y:350},template:templates.hero_zefira},enemy={path:{position:{x:530,y:360}},template:templates.enemy_blackguard}
 const source=row.kind==='melee-crit'?hero:row.kind==='melee-normal'?enemy:undefined,target=row.kind==='melee-normal'?hero:enemy
 d.showDamage(source,target,3,row.names,row.chance,row.conds,row.result)
 assert.equal(calls,row.calls.length,`${row.kind}/${row.roll}/${row.result} RNG`);assert.equal(d.pops.length,row.events.length)
 for(const [i,p]of d.pops.entries()){const n=row.events[i];assert.deepEqual(p.pos,n.pos);assert.equal(p.frame,n.frame);assert(Math.abs(p.rotation-n.rotation)<1e-8)}
}
console.log(`${frames} original Zefira critical frames match strict20% roll, full-animation factor lifetime, melee rounding/ranged capture, blink stacking/expiry and cancellations; 24 native damage-pop cases match RNG, result gates, target/source placement and rotation`)
