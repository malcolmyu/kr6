import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
let frames=0
for(const row of read('analysis/zefira-ranged-cancel-oracle.json')){
 const heroes=new HeroSystem(templates,new BarracksCombat(templates),()=>.5),h=heroes.insert('hero_zefira',{x:500,y:350},0),r=heroes.ranged,events=[]
 const e={id:999,hp:1000,name:'enemy_bandit',born:0,path:new PathFollower([{x:620,y:350},{x:621,y:350}]),template:structuredClone(templates.enemy_bandit),frozen:true}
 h.readyAt=-9;let time
 r.onQueueProjectile=p=>{events.push({at:time,pos:{...p.pos},factor:p.damageFactor})}
 for(const [frame,sample]of row.frames.entries()){
  time=frame/30;if(frame===row.cancelFrame)r.requestInterrupt(h)
  r.advance(time,1/30,[h],[e])
  assert.equal(!r.isAttacking(h),sample.done,`${row.cancelFrame}/${frame}`)
  if(frame>=row.cancelFrame){h.scriptLocked=true;assert.equal(h.readyAt,sample.cooldownTs+1)}
  frames++
 }
 assert.equal(events.length,row.events.length)
 for(const [i,event]of events.entries()){assert(Math.abs(event.at-row.events[i].at)<1e-8);assert.deepEqual(event.pos,row.events[i].pos);assert.equal(event.factor,row.events[i].factor)}
}
// Movement waits for the interrupted coroutine's yield; the release-boundary shot starts at the old position.
for(const cancelFrame of [6,12]){
 const b=new BarracksCombat(templates,()=>.5,()=>{}),heroes=new HeroSystem(templates,b,()=>.5),h=heroes.insert('hero_zefira',{x:500,y:350},0),e={id:999,hp:1000,name:'enemy_bandit',path:new PathFollower([{x:620,y:350},{x:621,y:350}]),template:structuredClone(templates.enemy_bandit),frozen:true}
 h.readyAt=-9;heroes.ranged.advance(0,1/30,[h],[e]);heroes.selectedId=h.id
 for(let frame=1;frame<=cancelFrame;frame++){
  if(frame===cancelFrame)heroes.moveSelected({x:300,y:350})
  heroes.advance(frame/30,1,[e]);heroes.advanceCombat(frame/30,1/30,[e])
 }
 assert.equal(h.pos.x,500);assert.equal(heroes.ranged.queuedProjectiles.length,cancelFrame===12?1:0)
 if(cancelFrame===12)assert.equal(heroes.ranged.queuedProjectiles[0].queuedAt,.4)
 heroes.advance((cancelFrame+1)/30,1,[e]);assert(h.pos.x<500,'Native transfer begins on following tick')
}
console.log(`${frames} native ranged-interruption frames match pre-release cancellation, exact release boundary, cooldown refund/commit, old firing position and next-tick movement`)
