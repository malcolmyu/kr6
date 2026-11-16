import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CulverineTowerSystem} from '../src/game/CulverineTower.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json');let frames=0
for(const row of read('analysis/culverine-tower-oracle.json')){
 const c=new CulverineTowerSystem(templates,()=>.5),site={id:'1',tower:`tower_culverine_lvl${row.level}`,pos:{x:500,y:350}},pos={x:500+row.offset[0],y:350+row.offset[1]},enemy={id:99,name:'enemy_bandit',hp:1000,template:templates.enemy_bandit,path:new PathFollower([pos,{x:pos.x+100,y:pos.y}])}
 const events=[];let time;c.onSound=sound=>events.push({at:time,sound});c.onShoot=(name,pos,to,target,factor,at)=>events.push({at,name,pos,to,factor})
 for(const [frame,n]of row.frames.entries()){
  time=row.born+frame/30;c.advance(time,[site],()=>({enemy,point:{...pos}}));const s=c.states.get('1'),label=`${row.level}/${row.born}/${row.offset}/${frame}`
  assert(Math.abs(s.attackAt-n.attackTs)<1e-8,`${label} attack timestamp`)
  for(const [i,p]of s.parts.entries()){const a=n.parts[i];assert.equal(p.name,a.name,`${label} part${i} name`);assert.equal(p.flip,a.flip,`${label} flip`);assert.equal(p.hidden,a.hidden,`${label} hidden`);assert.equal(p.loop,a.loop,`${label} loop`);assert(Math.abs(p.ts-a.ts)<1e-8,`${label} part${i} timestamp ${p.ts}/${a.ts}`)}
  frames++
 }
 assert.equal(events.length,row.events.length)
 for(const [i,e]of events.entries()){const n=row.events[i];assert(Math.abs(e.at-n.at)<1e-8);assert.equal(e.name,n.name);assert.equal(e.sound,n.sound);if(e.name){assert.deepEqual(e.pos,n.pos);assert.deepEqual(e.to,n.to);assert.equal(e.factor,n.factor);assert.equal(n.towerRef,false)}}
}
console.log(`${frames} native Culverine tower frames match four levels/facings, all five sprite states, hidden rear parts, strict release, repeated shots, Lv4 reload and unbound ray launch`)
