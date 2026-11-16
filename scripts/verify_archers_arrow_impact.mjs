import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/archers-arrow-impact-oracle.json')
for(const {level,kind,cell,roll,events:expected,calls:expectedCalls}of rows){
 let calls=0;const random=()=>{calls++;return roll},events=[],combat=new RangedCombat(templates,random,()=>{}),e={id:1,hp:kind==='dead'?0:1000,path:{position:{x:600,y:350}},template:structuredClone(templates.enemy_bandit),dodge:{chance:kind==='dodge'?1:0,ts:0,ranged:true,active:kind==='miss-active',show_pop:true,silent:true,pop:'pop_miss'}}
 e.template.unit.hit_offset={x:0,y:0};combat.dodges=new DodgeSystem(random,templates);combat.dodges.onCreate=name=>events.push({name});combat.cellAt=()=>cell;combat.onDamageCreate=()=>events.push({name:'damage'});combat.onEffectCreate=name=>events.push({name});combat.onSound=sound=>events.push({sound})
 const pos={x:600,y:kind==='miss-active'?450:350},name=`bullet_archers_lvl${level}`,p={name,pos,from:{x:500,y:350},to:{...pos},target:e,rotation:0,damageFactor:templates[name].bullet.damage_factor}
 combat.resolveArrow(p,templates[name].bullet,1,kind==='removed'?[]:[e])
 // Queue hooks are isolated here: blood insert audio is checked by full-battle sound traces.
 assert.equal(calls,expectedCalls,`${level}/${kind}/${cell}/${roll}/RNG`);assert.deepEqual(events.filter(e=>e.name),expected.filter(e=>e.name),`${level}/${kind}/${cell}/${roll}/damage/effect/pop allocation sequence`)
}
console.log(`${rows.length} original archer arrow landing traces: hit/dodge/active miss/dead/missing targets over land/water/ice, damage/effect/pop creation order and shared RNG match; queue audio is covered separately`)
