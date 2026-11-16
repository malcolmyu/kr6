import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
let frames=0
for(const row of read('analysis/gerald-ultimate-oracle.json')){
 const heroes=new HeroSystem(templates,new BarracksCombat(templates),()=>.5),h=heroes.insertGerald({x:500,y:350},row.born),u=heroes.geraldUltimate,events=[]
 h.facingLeft=row.flip;u.configure(['ulti'])
 const offsets=[[30,0],[50,0],[70,5],[70.01,5],[20,5],[20,5],[20,5],[20,5]],enemies=offsets.map(([x,y],i)=>({id:i+100,name:i===4?'enemy_crow':'enemy_bandit',hp:1000,path:{position:{x:500+(row.flip?-x:x),y:350+y}},template:structuredClone(templates[i===4?'enemy_crow':'enemy_bandit'])}))
 enemies[5].template.vis.flags|=32;enemies[6].template.vis.bans=4;enemies[7].template.vis.bans=8;h.target=enemies[0]
 u.onSound=name=>events.push({at:time,sound:name});u.onEffect=(name,pos,t,transform)=>events.push({at:t,name,pos,flip:transform?.flipX});let time
 for(const [frame,sample]of row.frames.entries()){
  time=row.born+frame/30
  if(row.mode==='target-dead'&&frame===30)enemies[0].hp=0
  if(row.mode==='cancel-early'&&frame===8||row.mode==='cancel-late'&&frame===30){h.scriptLocked=false;h.visualOverride=undefined;h.target=undefined}
  u.advance(time,h,enemies);heroes.zefiraSkills.modifiers.advance(time)
  assert.deepEqual(enemies.map(e=>e.hp),sample.hp,`${row.born}/${row.flip}/${row.mode} frame ${frame}`)
  assert.equal(h.xpQueued,sample.xp)
  assert(Math.abs(u.last-sample.cooldown)<1e-8)
  if(row.mode==='normal'||row.mode==='target-dead'){
   assert.equal(h.visualOverride?.name??'idle',sample.name)
   if(u.cast)assert(Math.abs(h.visualOverride.at-sample.ts)<1e-8)
  }
  frames++
 }
 const soundExpected=row.events.filter(e=>e.sound);assert.deepEqual(events.filter(e=>e.sound).map(e=>e.sound),soundExpected.map(e=>e.sound))
 for(const [i,e]of events.filter(e=>e.sound).entries())assert(Math.abs(e.at-soundExpected[i].at)<1e-8)
 const effects=events.filter(e=>e.name==='decal_gerald_ultimate'),expected=row.events.filter(e=>e.name==='decal_gerald_ultimate')
 assert.equal(effects.length,expected.length);for(const [i,effect]of effects.entries()){assert.deepEqual(effect.pos,expected[i].pos);assert.equal(effect.flip,row.flip);assert(Math.abs(effect.at-expected[i].at)<1e-8)}
}
console.log(`${frames} original Gerald ultimate frames match: 16-frame opening, strict hit wait, primary200/area150 with exclusion, visibility/air, death before impact, cancellation, XP/sounds/decal and recovery`)

{
 const {EnemyModifiers}=await import('../src/game/EnemyModifiers.ts')
 for(const row of read('analysis/ultimate-stun-stack-oracle.json')){
  const m=new EnemyModifiers(),e={id:999,hp:1000,path:{position:{x:500,y:350}},template:structuredClone(templates.enemy_bandit)}
  for(const [frame,sample]of row.frames.entries()){const time=row.born+frame/30
   if(frame===0)m.stun(e,time)
   if(frame===3||frame===6)m.stun(e,time,.5,'mod_gerald_ultimate_initial_stun')
   if(frame===12)m.stun(e,time,1,'mod_gerald_ultimate_hit_stun')
   m.advance(time);assert.equal(e.template.unit.stun_count,sample.count);assert.equal(!!e.template.unit.is_stunned,sample.stunned)
   if(frame===6){const initial=[...m.stuns.values()].find(s=>s.duration===.5);assert.equal(initial.animationAt,row.born+3/30,'Refresh keeps native animation clock')}
  }
 }
}
console.log('122 native modifier-lifecycle frames match: distinct stuns stack, same template refreshes clock without resetting animation')
