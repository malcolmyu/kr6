import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),base=read('public/data/entities.json'),rows=read(process.argv.includes('--paired-sequence')?'analysis/wizard-bolt-paired-sequence-oracle.json':'analysis/wizard-bolt-particles-oracle.json')
let frames=0,samples=0
for(const row of rows){
 const templates=structuredClone(base),e={id:123,name:'enemy_bandit',hp:40,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:620,y:350},{x:1200,y:350}])};if(row.kind==='immune')e.template.health.immune_to=4
 let calls=0,gold=0;const random=()=>{calls++;return (row.kind==='sequence'||row.kind==='paired-sequence')?[.9,.1,.8,.2,.7,.3,.6,.4][(calls-1)%8]:.25},c=new RangedCombat(templates,random,()=>gold+=5),all=[];c.dodges=new DodgeSystem(random,templates)
 const push=c.projectiles.push;c.projectiles.push=function(...items){all.push(...items);return push.apply(this,items)}
 for(let i=0;i<(row.kind==='two-lethal'||row.kind==='paired-sequence'?2:1);i++)c.wizardTowers.onShoot({id:'source',tower:`tower_wizard_lvl${row.rank}`,pos:{x:500,y:350},damageFactor:i?1.75:1},`bolt_tower_wizard_lvl${row.rank}`,{x:i===1&&row.kind==='two-lethal'?525:475,y:405},{id:e.id,pos:e.path.position},i===1&&row.kind==='two-lethal'?1:-1,0)
 for(const [index,n]of row.frames.entries()){
  const tick=index+1,time=(row.birth+tick)*(1/30),ctx=`${row.rank}/${row.birth}/${row.kind}/${tick}`
  e.path.position.x=620+(row.kind==='moving'?(tick-1)*40/30:0);e.template.vis.bans=row.kind==='insert-ban'||row.kind==='ban-impact'&&tick>=6?2:0
  c.advance(time,[],row.kind==='removed-return'&&tick>=6&&tick<13?[]:[e])
  assert.equal(e.hp,n.hp,ctx+'/HP');assert.equal(e.diedAt!==undefined,n.dead,ctx+'/dead');assert.equal(gold,n.gold,ctx+'/gold');assert.equal(calls,n.calls,ctx+'/RNG')
  for(const [i,p]of n.shots.entries()){
   const w=all[i];if(!w){assert.equal(p.active,false);continue}
   assert.equal(c.projectiles.includes(w),p.active,ctx+'/source membership');assert.equal(w.hidden??false,p.hidden,ctx+'/hidden');assert.equal(w.tracking,p.bound,ctx+'/bound')
   for(const key of ['x','y']){assert(Math.abs(w.pos[key]-p.pos[key])<1e-7,ctx+'/position');assert(Math.abs(w.to[key]-p.to[key])<1e-7,ctx+'/destination')}
   assert(Math.abs(w.rotation-p.rotation)<1e-8,ctx+'/rotation')
  }
  const expected=n.trails.filter(t=>t.active),actual=c.firebookTrails.trails
  assert.equal(actual.length,expected.length,ctx+'/emitter count')
  for(const t of expected){const w=actual.find(p=>p.sourceId===all[t.source-1]?.id);assert(w,ctx+'/source mapping');assert.equal(w.emit,t.emit,ctx+'/emit');assert(Math.abs(w.emitTs-t.emitTs)<1e-9,ctx+'/emitTs');assert.equal(w.particles.length,t.particles.length,ctx+'/particle count')
   for(const [i,p]of w.particles.entries()){const q=t.particles[i];for(const k of ['at','lifetime','rotation','alpha','drawOrder'])assert(Math.abs(p[k]-q[k])<1e-8,ctx+`/${i}/${k} ${p[k]}/${q[k]}`);assert.equal(p.frame,q.frame,ctx+'/frame');for(const k of ['x','y']){assert(Math.abs(p.pos[k]-q.pos[k])<1e-7,ctx+'/particle position');assert(Math.abs(p.scale[k]-q.scale[k])<1e-8,ctx+'/scale')}samples++}
  }
  frames++
 }
 assert.equal(c.dodges.pops.length,row.pops.length)
 for(const [i,p]of c.dodges.pops.entries()){const n=row.pops[i];assert(Math.abs(p.at-n.at)<1e-9);assert.equal(p.frame,n.frame);assert(Math.abs(p.rotation-n.rotation)<1e-8);for(const k of ['x','y'])assert(Math.abs(p.pos[k]-n.pos[k])<1e-7)}
}
console.log(`${rows.length} native wizard bolt+health+pops+particles traces / ${frames} frames / ${samples} particle samples: four ranks/births,50/s emission,60FPS frames/1.2 scale, damage/RNG, held tracking/removal/return/immunity, paired lethal shots, hidden retained body and final cleanup`)
