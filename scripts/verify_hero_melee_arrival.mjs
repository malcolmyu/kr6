import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {HeroSystem} from '../src/game/HeroSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/hero-melee-arrival-oracle.json')
let frames=0,arrivalYields=0,exactBoundaryWaits=0
for(const row of rows){
 const b=new BarracksCombat(templates,()=>.25,()=>{}),heroes=new HeroSystem(templates,b,()=>.25),pos={x:600-30-templates[row.name].soldier.melee_slot_offset.x-row.distance,y:350},h=heroes.insert(row.name,pos,row.birth*(1/30)),attack=h.template.melee.attacks[row.attack-1]
 h.template.melee.attacks=[attack]
 h.motionArrived=false
 const template=structuredClone(templates.enemy_bandit);delete template.melee
 const e={id:1000,name:'enemy_bandit',hp:1000,template,path:{position:{x:600,y:350},direction:{x:-40,y:0},remainingNodes:100,finished:false}},hits=[]
 let previousHp=e.hp
 for(const n of row.frames){
  const time=n.tick*(1/30),context=`${row.name}/attack${row.attack}/birth${row.birth}/distance${row.distance}/tick${n.tick}`
  b.advance(time,1/30,[],[e])
  assert(Math.hypot(h.pos.x-n.pos.x,h.pos.y-n.pos.y)<1e-8,context+'/position')
  assert.equal(e.hp,n.enemyHp,context+'/HP')
  assert.equal(h.motionArrived,n.arrived,context+'/persistent motion arrival')
  if(n.animation===attack.animation){assert(h.attack,context+'/attack started');assert.equal(h.attack.startedAt,n.ts,context+'/attack start clock')}
  else{assert.equal(h.attack,undefined,context+'/arrival yields before attack');if(h.pos.x===600-30-h.template.soldier.melee_slot_offset.x)arrivalYields++}
  if(h.attack&&h.attack.nextHit===0&&Math.abs(time-h.attack.startedAt-attack.hit_time)<1e-8)exactBoundaryWaits++
  if(e.hp!==previousHp){hits.push({tick:n.tick,value:previousHp-e.hp});previousHp=e.hp}
  frames++
 }
 assert.deepEqual(hits,[row.damage],`${row.name}/attack${row.attack}/birth${row.birth}/distance${row.distance}/damage clock`)
}
assert(arrivalYields>0);assert(exactBoundaryWaits>0)
console.log(`${rows.length} original preselected hero move-to-slot/first-strike traces / ${frames} frames match positions, arrival yields, attack start clocks, exact hit waits and damage; ${exactBoundaryWaits} near-boundary waits retained. Attack selection, completion and the full hero main script are outside this isolated gate.`)
