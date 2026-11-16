import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {ZefiraMovement} from '../src/game/ZefiraMovement.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
const hero=born=>new HeroSystem(templates,new BarracksCombat(templates)).insert('hero_zefira',{x:500,y:350},born)
let moveFrames=0,buffFrames=0
for(const row of read('analysis/zefira-blink-oracle.json')){
 const h=hero(row.born),m=new ZefiraMovement(),events=[];m.configure(row.level?['skill_c']:[])
 m.onSound=name=>events.push({at:currentTime,sound:name});let currentTime
 m.request(h,{x:500+row.distance,y:350})
 for(const sample of row.frames){
  currentTime=Math.round(sample.at*30)/30;m.advance(currentTime,h)
  assert.equal(!m.state,sample.done,`${row.born}/${row.distance}/${row.level} at ${currentTime} done`)
  assert(Math.abs(h.pos.x-sample.x)<1e-8);assert(Math.abs(h.pos.y-sample.y)<1e-8)
  if(m.state){assert.equal(h.visualOverride?.name,sample.name);assert(Math.abs(h.visualOverride.at-sample.ts)<1e-8)}
  assert.equal(!!h.ignoreDamage,sample.ignore);assert.equal(h.template.health_bar.hidden,sample.hidden);assert.equal(h.template.vis.bans,sample.bans);moveFrames++
 }
 assert.deepEqual(events.map(e=>e.sound),row.events.filter(e=>e.sound).map(e=>e.sound))
 for(let i=0;i<events.length;i++)assert(Math.abs(events[i].at-row.events.filter(e=>e.sound)[i].at)<1e-8)
 assert.equal(!!m.buff,false)
}
for(const row of read('analysis/zefira-blink-buff-oracle.json')){
 const h=hero(row.born),m=new ZefiraMovement();m.configure(['skill_c',...(row.level>=2?['upg_sc1']:[]),...(row.level===3?['upg_sc2']:[])]);m.applyBuff(h,row.born)
 for(const sample of row.frames){
  const time=Math.round(sample.at*30)/30,frame=Math.round((time-row.born)*30)
  if(row.mode==='refresh'&&frame===Math.round(((2+row.level*2)+.1)*30))m.applyBuff(h,time)
  if(row.mode==='death'&&frame===60)h.hp=0
  m.advance(time,h)
  assert.equal(!m.buff,sample.removed,`${row.born}/${row.level}/${row.mode} at ${time}`)
  assert(Math.abs((h.template.unit.damage_factor??1)-sample.factor)<1e-10)
  if(m.buff){assert.equal(m.buff.phase,sample.sprites[0].name);assert(Math.abs(m.buff.animationAt-sample.sprites[0].ts)<1e-8)}buffFrames++
 }
}
for(const row of read('analysis/zefira-redirect-oracle.json')){
 const h=hero(0),m=new ZefiraMovement();m.configure(['skill_c']);m.request(h,{x:500+row.scenario.start,y:350})
 for(const sample of row.frames){const time=Math.round(sample.at*30)/30;if(Math.round(time*30)===row.scenario.at)m.request(h,{x:500+row.scenario.to,y:350});m.advance(time,h)
  assert(Math.abs(h.pos.x-sample.x)<1e-8,`${JSON.stringify(row.scenario)} at ${time}: ${h.pos.x} != ${sample.x}`)
  assert.equal(!!h.ignoreDamage,sample.ignore,`${JSON.stringify(row.scenario)} at ${time} ignore`);assert.equal(h.template.health_bar.hidden,sample.hidden)
  if(m.state){assert.equal(h.visualOverride.name,sample.name);assert(Math.abs(h.visualOverride.at-sample.ts)<1e-8)}
 }
}
console.log(`${moveFrames} original Zefira movement frames and ${buffFrames} blink-modifier frames match, including distance boundary, immunity, three levels, refresh during ending and death`)
// A real ranged projectile snapshots the unit factor when it is created, even if the buff expires in flight.
{
 const systems=new HeroSystem(templates,new BarracksCombat(templates),()=>.5),h=systems.insert('hero_zefira',{x:500,y:350},0),m=systems.zefiraMovement
 const {PathFollower}=await import('../src/game/PathFollower.ts')
 const e={id:999,name:'enemy_bandit',hp:1000,frozen:true,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:640,y:350},{x:650,y:350}]),born:0}
 m.configure(['skill_c']);m.applyBuff(h,0)
 for(let frame=0;frame<30&&!systems.ranged.projectiles.length;frame++)systems.ranged.advance(frame/30,1/30,[h],[e])
 const p=systems.ranged.projectiles[0];assert(p);assert.equal(p.damageFactor,1.3)
 h.deploying=true;for(let frame=0;frame<=150;frame++)m.advance(frame/30,h);assert(Math.abs(h.template.unit.damage_factor-1)<1e-10)
 for(let frame=0;frame<120&&systems.ranged.projectiles.length;frame++)systems.ranged.advance(5+frame/30,1/30,[h],[e])
 assert.equal(e.hp,989)
}
