import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {globalUpgradePoints,validateGlobalUpgrades,globalUpgradeTemplates,globalUpgradeKinds} from '../src/game/GlobalUpgrades.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/global-upgrades.json'),templates=read('public/data/entities.json'),native=read('analysis/global-upgrade-points-oracle.json')
const empty=native.filter(r=>Array.isArray(r.selected)&&r.selected.length===0);assert.equal(empty.length,18)
for(const row of empty){
 const progress={levels:Object.fromEntries(Array.from({length:row.stage},(_,i)=>[String(i+1),{campaign:row.stars,...(row.iron?{iron:true}:{})}]))},points=globalUpgradePoints(progress)
 assert.equal(points,row.remaining,'Original upgrade room points, independent of stars/iron');assert(points<=4)
 for(const kind of globalUpgradeKinds){assert(data.nodes[kind].ulti.cost>points);const selected=validateGlobalUpgrades(points,{[kind]:['l1','l2','l3a','l4a','ulti']});assert(!selected[kind]?.includes('ulti'));const patched=globalUpgradeTemplates(templates,selected);assert.equal(patched.tower_culverine_lvl4.powers.ultimate.active,false)}
}
console.log('Original first-three-stage point oracle: maximum4 global points regardless of stars/iron; every tower ultimate costs5 before prerequisites and remains legally unavailable, including Culverine')
