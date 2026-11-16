import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/hero-ranged-death-continuation-oracle.json');let frames=0,boundaryShots=0,idleContinuations=0
for(const row of rows){
 let calls=0;const random=()=>{calls++;return row.roll},b=new BarracksCombat(templates,random,()=>{}),heroes=new HeroSystem(templates,b,random),h=heroes.insert('hero_zefira',{x:500,y:350},row.birth*(1/30)),r=heroes.ranged
 const e={id:999,name:'enemy_bandit',hp:1000,frozen:true,path:new PathFollower([{x:620,y:350},{x:900,y:350}]),template:structuredClone(templates.enemy_bandit)},events=[]
 b.deferHeroes=true;h.readyAt=-9;h.rangedCriticalChance=.2;h.idleVisual={name:'idle',at:-.27,loop:true};let done=false,handled,time
 r.onQueueProjectile=p=>events.push({at:time,name:p.name,pos:{...p.pos},factor:p.damageFactor})
 for(const [frame,f]of row.frames.entries()){
  time=f.tick*(1/30)
  if(frame===row.deathFrame)h.hp=0
  if(!done){
   if(h.hp<=0){const before=events.length,fired=r.resumeDeath(h,time);if(events.length>before)boundaryShots++;handled=!fired;done=true;if(fired){b.finishHeroRangedMain(h,time,1/30);b.finishHeroIdle(h,time,1/30);idleContinuations++}}
   else{r.advanceHero(time,h,[e]);if(!r.isAttacking(h)){done=true;handled=false;b.finishHeroRangedMain(h,time,1/30);b.finishHeroIdle(h,time,1/30);idleContinuations++}}
  }
  const context=`${row.birth}/${row.deathFrame}/${row.roll}/${f.tick}`,pose=h.visualOverride??h.idleVisual
  assert.equal(done,f.done,context+'/coroutine');assert.equal(handled,f.handled,context+'/wrapper result');assert.equal(pose.name,f.animation,context+'/animation');assert.equal(pose.at,f.at,context+'/animation clock');assert.equal(pose.loop??false,f.loop,context+'/loop');assert.equal(h.template.unit.damage_factor,f.factor,context+'/critical factor');assert.equal(calls,f.calls+1,context+'/wrapper RNG plus the single successful production target-pick roll');assert.equal(events.length,f.shots,context+'/shots');frames++
 }
 assert.deepEqual(events,row.events,`${row.birth}/${row.deathFrame}/${row.roll}/projectile capture`)
}
assert(boundaryShots>0);assert(idleContinuations>0)
console.log(`${rows.length} original ranged death traces / ${frames} frames match windup interruption, exact shoot boundary, fired tail → idle, critical cleanup, projectile capture and RNG (${boundaryShots} boundary shots, ${idleContinuations} idle continuations)`)
