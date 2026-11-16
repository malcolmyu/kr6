import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CulverineRaySystem} from '../src/game/CulverineRay.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json');let frames=0
for(const row of read('analysis/culverine-ray-oracle.json')){
 const positions=[[620,350],[647.5,350],[675,350],[675.001,350],[620,388.5],[620,388.501]],enemies=positions.map(([x,y],i)=>({id:i+1,name:'enemy_bandit',hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x,y},{x:x+100,y}])})),rays=new CulverineRaySystem(templates),ray=rays.launch(`bullet_culverine_lvl${row.level}`,{x:516,y:415},{x:620,y:350},enemies[0],row.bound?'tower':undefined,row.factor,-1/30)
 let time,damage=[];const effects=[];rays.onDamage=(e,value,type)=>damage.push({target:e.id,value,type});rays.onEffect=(name,pos,at)=>effects.push({name,pos,at})
 for(const [frame,n]of row.frames.entries()){
  time=frame/30;damage=[];if(row.mode==='target-moves'&&frame===1)enemies[0].path.position.x+=60
  rays.advance(time,enemies,()=>!row.mode.startsWith('tower-sold')||frame<3)
  const label=`${row.level}/${row.factor}/${row.mode}/${frame}`
  assert.equal(ray.hidden,n.hidden,label);assert.equal(ray.removed,n.removed,label)
  assert(Math.abs(ray.rotation-n.rotation)<1e-10,label);assert(Math.abs(ray.scale.x-n.scale.x)<1e-10,label);assert.equal(ray.scale.y,n.scale.y)
  const sorted=d=>d.toSorted((a,b)=>a.target-b.target);assert.deepEqual(sorted(damage),sorted(n.damage),`${label} damage`);frames++
 }
 const native=row.events.filter(e=>e.name.startsWith('fx_'));assert.equal(effects.length,native.length)
 for(const [i,e]of effects.entries()){assert.equal(e.name,native[i].name);assert.deepEqual(e.pos,native[i].pos);assert(Math.abs(e.at-native[i].at)<1e-10)}
}
console.log(`${frames} native Culverine ray/aura frames match all four levels, Royal factor, ellipse boundaries, fixed destination, next-tick blast, visibility, rotation/scale and source sale`)
