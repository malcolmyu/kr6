import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {DodgeSystem,blockPopScale} from '../src/game/DodgeSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
let frames=0
for(const row of read('analysis/gerald-dodge-melee-oracle.json')){
 let index=0,time=row.born;const random=()=>row.pattern[index++%row.pattern.length],b=new BarracksCombat(templates,random,()=>{}),h=b.insertHero('hero_gerald',{x:530,y:350},row.born,structuredClone(templates.hero_gerald))
 h.hp=220;h.template.health.hp_max=220;h.scriptLocked=true;h.dodge.chance=row.chance;h.template.health.armor=0
 const e={id:999,name:'enemy_bandit',hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:500,y:350},{x:510,y:350}]),born:row.born}
 // The native fixture stops at damage_queue: S.pops is tested separately against its own oracle.
 e.template.melee.attacks[0].pop=undefined;e.template.melee.attacks[0].ts=row.born-10
 h.target=e;let previous=h.hp;const damages=[]
 for(const [frame,sample]of row.frames.entries()){time=row.born+frame/30
  b.advance(time,1/30,[],[e]);e.template.melee.attacks[0].disabled=true; // Native fixture invokes one attack coroutine only.
  if(h.hp!==previous){damages.push(previous-h.hp);previous=h.hp}
  assert.deepEqual(damages,sample.damage,`${row.born}/${row.chance}/${row.pattern} at ${time}`)
  assert.equal(h.dodge.active,sample.active)
  if(sample.lastCheck!==undefined)assert(Math.abs(h.dodge.last_check_ts-sample.lastCheck)<1e-9)
  else assert.equal(h.dodge.last_check_ts,undefined)
  frames++
 }
 assert.equal(index,row.randoms.length)
 assert.equal(b.dodges.pops.length,row.pops.length)
 for(let i=0;i<row.pops.length;i++){const a=b.dodges.pops[i],n=row.pops[i];assert(Math.abs(a.at-n.at)<1e-9);assert.deepEqual(a.pos,n.pos);assert(Math.abs(a.rotation-n.rotation)<1e-9)}
}
for(const row of read('analysis/block-pop-oracle.json')){
 const d=new DodgeSystem(()=>.5);d.pops.push({id:1,at:row.born,pos:{x:0,y:0},rotation:0})
 for(const sample of row.frames){const time=Math.round(sample.at*30)/30;d.advance(time);assert.equal(!d.pops.length||d.pops[0].removalQueuedAt!==undefined,sample.removed,'legacy tween oracle records the removal request, not the following flush');assert(Math.abs(blockPopScale(time-row.born)-sample.scale.x)<1e-8)}
}
console.log(`${frames} native melee dodge frames match: both hit checks, zero/unlocked chance, boundary RNG, damage skips and original pop events; native pop tween also matches`)
// Actual KR6 shadow-arrow script checks at collision, emits a pop, then follows the land miss branch.
{
 const {EnemyRangedCombat}=await import('../src/game/EnemyRangedCombat.ts'),{EnemyArrowMotion}=await import('../src/game/EnemyArrowMotion.ts')
 for(const row of read('analysis/gerald-dodge-arrow-oracle.json')){
  let count=0;const random=()=>{count++;return row.roll},b=new BarracksCombat(templates,random,()=>{}),h=b.insertHero('hero_gerald',{x:120,y:0},0,structuredClone(templates.hero_gerald))
  h.hp=220;h.template.health.hp_max=220;h.template.health.armor=0;h.dodge.chance=row.chance
  const c=new EnemyRangedCombat(read('public/data/level03.json'),templates,random);c.dodges=b.dodges
  const from={x:0,y:0},to={x:120,y:12},motion=new EnemyArrowMotion(from,to,templates.bullet_shadow_archer.bullet),effects=[];let misses=0
  c.onEffect=name=>effects.push(name);c.onMiss=()=>misses++
  c.projectiles.push({id:999,name:'bullet_shadow_archer',born:0,pos:{...from},to,rotation:0,hidden:true,motion,target:h})
  for(const [frame,sample]of row.frames.entries()){
   c.advance(frame/30,1/30,[],[h]);assert.deepEqual(220-h.hp,sample.damage.reduce((a,b)=>a+b,0));assert.equal(h.dodge.active,sample.active)
   assert.equal(c.projectiles.length===0,sample.done)
  }
  assert.equal(count,row.randoms.length)
  assert.equal(misses,row.effects.some(e=>e.name==='decal_tween')?1:0)
  assert.deepEqual(effects,row.effects.filter(e=>e.name==='fx_blood_splat').map(e=>e.name))
  const pops=row.effects.filter(e=>e.name==='pop_block');assert.equal(b.dodges.pops.length,pops.length)
  for(const [i,p]of pops.entries()){assert.deepEqual(b.dodges.pops[i].pos,p.pos);assert(Math.abs(b.dodges.pops[i].rotation-p.rotation)<1e-8)}
 }
}
console.log('366 native KR6 arrow-dodge frames match collision time, damage/blood versus block/miss, pop offsets/rotation and RNG count')
for(const row of read('analysis/gerald-dodge-check-oracle.json')){
 let calls=0;const b=new BarracksCombat(templates,()=>.5,()=>{}),h=b.insertHero('hero_gerald',{x:0,y:0},0,structuredClone(templates.hero_gerald)),d=new DodgeSystem(()=>{calls++;return row.roll}),scenario=row.scenario
 h.dodge.chance=scenario==='zero'?0:.35;h.template.unit.is_stunned=scenario==='stun';h.dodge.ranged=scenario!=='melee-only';h.dodge.requires_magic=scenario==='requires-magic'
 if(scenario.startsWith('cooldown-'))h.dodge.cooldown=scenario==='cooldown-boundary'?3:2.9
 const result=d.check(h,3,true,{damage_type:scenario==='no-dodge'?33554434:2})
 assert.equal(result,row.result);assert.equal(calls,row.calls);assert.equal(h.dodge.active,row.active);assert.equal(h.dodge.last_check_ts,row.lastCheck);assert.equal(h.dodge.last_doge_ts,row.lastDodge)
}
console.log('24 original dodge predicate cases match stun, ranged permission, strict cooldown, NO_DODGE flags, exact chance boundary and skipped RNG')
