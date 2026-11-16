import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const templates=JSON.parse(readFileSync('public/data/entities.json')),rows=JSON.parse(readFileSync('analysis/bomb-pops-oracle.json'))
// Original export_bomb_pops.lua explicitly removes particles to isolate landing pops.
for(let rank=1;rank<=4;rank++)templates[`bullet_catapult_lvl${rank}`].bullet.particles_name=undefined
for(const row of rows){
 let calls=0;const random=()=>{calls++;return row.roll},c=new RangedCombat(templates,random,()=>{});c.dodges=new DodgeSystem(random,templates)
 const enemies=Array.from({length:row.count},(_,i)=>({id:i+1,hp:1000,name:'enemy_bandit',template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:501+i,y:350},{x:1000,y:350}])}))
 c.catapultTowers.onShoot({id:'test'},`bullet_catapult_lvl${row.rank}`,{x:400,y:400},{x:500,y:350},1,0,1)
 for(const n of row.frames){c.advance(n.at,[],enemies);assert.equal(calls,n.calls,`${row.rank}/${row.count}/${row.roll} at ${n.at}`)}
 assert.equal(c.dodges.pops.length,row.pops.length)
 for(const [i,p]of c.dodges.pops.entries()){const n=row.pops[i];assert(Math.abs(p.at-n.at)<1e-9);for(const k of ['x','y'])assert(Math.abs(p.pos[k]-n.pos[k])<1e-7);assert(Math.abs(p.rotation-n.rotation)<1e-9);assert.equal(p.frame,n.frame)}
}
console.log(`${rows.length} native bomb landing-pop traces: one landing attempt independent of zero/one/three targets, strict20% gate, position, rotation and random consumption`)
