import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
import {ZefiraUltimate} from '../src/game/ZefiraUltimate.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json');let count=0
for(const row of read('analysis/zefira-ultimate-oracle.json')){
 const level=read(`public/data/level0${row.stage}.json`),b=new BarracksCombat(templates,()=>.5,()=>{}),heroes=new HeroSystem(templates,b,()=>.5),h=heroes.insert('hero_zefira',row.pos,row.born),u=new ZefiraUltimate(()=>.5,()=>{})
 u.level=level;u.configure(['ulti']);if(row.mode==='blink-factor')h.template.unit.damage_factor=1.5;const enemies=row.enemies.map((e,i)=>{const path=new EnemyPath(level.paths.paths,level.navigation,e.pi,e.spi);path.ni=e.ni;Object.assign(path.position,e.pos);return {id:999+i,name:'enemy_bandit',hp:1000,template:{...structuredClone(templates.enemy_bandit),vis:{flags:e.flags,bans:e.bans}},path}})
 let time;const events=[],spears=[];u.onSound=sound=>events.push({at:time,sound});u.onEffect=(name,pos,at,flip)=>events.push({at,name,pos:{...pos},flip})
 for(const [frame,n]of row.frames.entries()){
  time=row.born+frame/30
  if(row.mode==='target-dies'&&frame===20)enemies[0].hp=0
  if(row.mode==='cancel-early'&&frame===8||row.mode==='cancel-late'&&frame===30||row.mode==='cancel-release'&&frame===18)u.requestInterrupt()
  u.advance(time,h,enemies,row.mode==='battle-start'&&frame<60?0:1)
  for(const s of u.spears)if(!spears.includes(s))spears.push(s)
  const label=`stage${row.stage}/${row.born}/${row.mode}/${frame}`
  assert.deepEqual(enemies.map(e=>e.hp),n.hp,`${label} damage`);assert.equal(h.xpQueued,n.xp,`${label} XP`)
  assert(Math.abs(u.last-n.cooldown)<1e-8,`${label} cooldown ${u.last}/${n.cooldown}`)
  assert.equal(spears.length,n.spears.length,`${label} spear count`)
  for(const [i,s]of spears.entries()){const expected=n.spears[i];assert.equal(s.phase,expected.name,`${label} spear${i} phase`);assert.equal(s.removed,expected.removed,`${label} spear${i} removed`);assert(Math.abs((s.animationAt??0)-expected.ts)<1e-8,`${label} spear${i} clock ${s.animationAt}/${expected.ts}`)}
  assert.equal(h.visualOverride?.name??'idle',n.name,`${label} hero animation`);count++
 }
 for(const kind of ['sound','decal_zefira_ultimate_spear','decal_zefira_ultimate_spear_floor']){
  const filter=e=>kind==='sound'?!!e.sound:e.name===kind,a=events.filter(filter),n=row.events.filter(filter);assert.equal(a.length,n.length)
  for(const [i,e]of a.entries()){const expected=n[i];assert(Math.abs(e.at-expected.at)<1e-8);if(e.pos){assert.deepEqual(e.pos,expected.pos);assert.equal(e.flip,expected.flip)}else assert.equal(e.sound,expected.sound)}
 }
}
console.log(`${count} native Zefira ultimate frames match three-map path placement, insufficient/ahead targets, early/late interruption, cooldown/XP, all spear damage and animation phases`)
for(const interruptFrame of [8,30]){
 const level=read('public/data/level01.json'),b=new BarracksCombat(templates,()=>.5,()=>{}),heroes=new HeroSystem(templates,b,()=>.5),pos=level.paths.paths[0][0][149],h=heroes.insert('hero_zefira',pos,0),u=heroes.zefiraUltimate
 u.level=level;u.configure(['ulti']);const enemies=[1,2,3].map(i=>{const path=new EnemyPath(level.paths.paths,level.navigation,1,i);path.ni=135+i*2;Object.assign(path.position,level.paths.paths[0][i-1][path.ni-1]);return {id:999+i,name:'enemy_bandit',hp:1000,template:structuredClone(templates.enemy_bandit),path}})
 heroes.selectedId=h.id;let completedAt,movedAt,emitted=0;u.onEffect=name=>{if(name==='decal_zefira_ultimate_spear')emitted++}
 for(let frame=0;frame<90;frame++){
  const time=frame/30
  if(frame===interruptFrame)assert(heroes.moveSelected({x:pos.x+200,y:pos.y}))
  const casting=!!u.cast;heroes.advance(time,1,enemies)
  if(casting&&!u.cast&&completedAt===undefined)completedAt=frame
  if(heroes.zefiraMovement.state&&movedAt===undefined)movedAt=frame
  if(frame===interruptFrame){assert.equal(heroes.zefiraMovement.state,undefined);assert.deepEqual(h.pos,pos)}
 }
 assert.equal(movedAt,completedAt+1)
 assert.equal(emitted,interruptFrame===8?0:21)
 if(interruptFrame===30)assert(completedAt>interruptFrame,'ordinary spear waits must finish before moving')
}
console.log('Hero-system movement waits for ultimate cancellation or completed spear emission, then resumes on the following tick')
