import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
let hits=0
for(const row of read('analysis/enemy-melee-damage-oracle.json')){
 const b=new BarracksCombat(templates,()=>row.random,()=>{}),s=b.insertHero('soldier_knights_lvl1',{x:530,y:350},0,structuredClone(templates.soldier_knights_lvl1)),e={id:999,name:'enemy_bandit',hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:500,y:350},{x:510,y:350}]),born:0}
 s.dodge=undefined; // Isolate integer damage; zero-chance RNG edges have a separate native dodge oracle.
 s.scriptLocked=true;s.template.health.armor=0;s.target=e;e.template.unit.damage_factor=row.factor
 Object.assign(e.template.melee.attacks[0],{ts:-10,damage_min:row.min,damage_max:row.max,hit_damage_factor:row.hitFactors})
 let previous=s.hp;const actual=[]
 for(let frame=0;frame<=15;frame++){b.advance(frame/30,1/30,[],[e]);if(s.hp!==previous){actual.push(previous-s.hp);previous=s.hp}}
 assert.deepEqual(actual,row.damage,`roll ${row.random}, factor ${row.factor}`);hits+=actual.length
}
console.log(`${hits} original enemy melee hits match integer rolls, per-hit factors and unit multipliers`)
