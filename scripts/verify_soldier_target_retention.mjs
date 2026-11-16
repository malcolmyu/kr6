import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/soldier-target-retention-oracle.json');let frames=0
for(const {name,kind,frames:trace}of rows){
 const b=new BarracksCombat(templates,()=>.25,()=>{}),s=b.insertHero(name,{x:500,y:350},0,structuredClone(templates[name]));s.hp=10000;s.template.health.hp_max=10000;s.hero=name.startsWith('hero_');s.rally=s.center={x:520,y:350};s.motionArrived=true;s.template.melee.attacks.forEach(a=>a.cooldown=100000)
 const make=id=>({id,name:'enemy_bandit',hp:10000,template:structuredClone(templates.enemy_bandit),path:{position:{x:560,y:350},direction:{x:-40,y:0},remainingNodes:100,finished:false}}),first=make(1),second=make(2);let pool=[first];s.target=first;b.blockers(first)
 const label=e=>e===first?'first':e===second?'second':undefined
 for(const f of trace){
  if(f.tick===5){if(kind==='dead')first.hp=0;else if(kind==='banned')first.template.vis.bans|=1;else pool=[]}
  if(f.tick===15&&kind==='missing-reset')b.releaseKnight(s)
  if(f.tick===25)pool.push(second)
  const time=f.tick*(1/30);if(s.hero)b.advanceSoldierMain(s,time,1/30,[],pool);else b.advanceKnightMain(s,time,1/30,[],pool)
  const ctx=`${name}/${kind}/${f.tick}`;assert.equal(label(s.target),f.active,ctx+'/active target');assert.equal(label(b.storedTarget(s)),f.stored,ctx+'/stored target record');assert(Math.hypot(s.pos.x-f.pos.x,s.pos.y-f.pos.y)<1e-8,ctx+'/return/slot position');assert.equal(s.motionArrived,f.arrived,ctx+'/arrived');assert.equal(pool.includes(first)?b.blockers(first).length:0,f.firstBlockers,ctx+'/first blockers');assert.equal(b.blockers(second).length,f.secondBlockers,ctx+'/second blockers');frames++
 }
}
console.log(`${rows.length} original soldier target retention traces / ${frames} frames: missing entity keeps stored ID without blocking, dead/banned target unblocks, return/arrival, explicit release and replacement clear old record; both heroes and knight match`)
