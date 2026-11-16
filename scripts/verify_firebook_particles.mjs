import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {nativeTrailParticleOrder} from '../src/game/FirebookTrail.ts'
import {RangedCombat} from '../src/game/RangedCombat.ts'
const painter=process.argv.includes('--painter')
const lateMain=process.argv.includes('--late-main'),combined=process.argv.includes('--combined')||lateMain
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read(painter?'analysis/firebook-particles-painter-oracle.json':lateMain?'analysis/firebook-particles-late-main-oracle.json':combined?'analysis/firebook-particles-combined-oracle.json':'analysis/firebook-particles-oracle.json')
if(!combined)templates.bullet_firebook_wizard.bullet.pop=undefined
let frames=0,particles=0
for(const row of rows){
 let calls=0;const random=()=>{calls++;return row.roll==='sequence'?[.01,.91,.19,.81,.39,.61,.59,.41][(calls-1)%8]:row.roll},c=new RangedCombat(templates,random,()=>{})
 if(lateMain)c.deferParticlePhase=true
 const enemy=combined?{id:123,hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([row.to,{x:1200,y:350}])}:undefined
 if(combined)c.dodges=new DodgeSystem(random,templates)
 c.wizardTowers.onFirebook({id:'source'},'bullet_firebook_wizard',{x:500,y:390},row.to,1,1,40,40,0)
 for(const [i,n]of row.frames.entries()){
  const tick=i+1,time=(row.birth+tick)*(1/30),ctx=`${row.birth}/${row.to.x},${row.to.y}/${row.roll}/${row.kind}/${tick}`
  if(row.kind==='removed'&&tick===12)c.projectiles.length=0
  c.advance(time,[],enemy?[enemy]:[])
  if(lateMain){random();c.advanceParticles?.(time)}
  if(combined)assert.equal(enemy.hp,n.hp,ctx+'/HP')
  const t=c.firebookTrails.trails[0],actual=t?.particles??[]
  assert.equal(calls,n.calls,ctx+'/RNG');assert.equal(!!t,n.emitter,ctx+'/emitter');assert.equal(actual.length,n.particles.length,ctx+'/particles')
  if(t){assert.equal(t.emit,n.emit,ctx+'/emit');assert(Math.abs(t.emitTs-n.emitTs)<1e-9,ctx+'/emitTs');assert(Math.abs(t.at-n.emitterAt)<1e-9)}
  for(const [j,p]of actual.entries()){const q=n.particles[j];for(const k of ['at','lifetime','rotation','alpha','drawOrder'])assert(Math.abs(p[k]-q[k])<1e-8,ctx+`/particle${j}/${k} ${p[k]}/${q[k]}`);for(const k of ['x','y']){assert(Math.abs(p.pos[k]-q.pos[k])<1e-7,ctx+'/position');assert.equal(p.scale[k],q.scale[k])}assert.equal(p.frame,q.frame,ctx+'/frame');if(painter){const [order,k]=nativeTrailParticleOrder(t,p,0);assert.equal(order,20000+q.paint.z);assert.equal(k.z,q.paint.z);assert.equal(k.draw,q.paint.draw);for(const field of ['x','y'])assert(Math.abs(k[field]-q.paint[field])<1e-7,ctx+'/native render '+field)}particles++}
  frames++
 }
 if(combined){assert.equal(c.dodges.pops.length,row.pops.length);for(const [i,p]of c.dodges.pops.entries()){const n=row.pops[i];assert(Math.abs(p.at-n.at)<1e-9);assert.equal(p.frame,n.frame);assert(Math.abs(p.rotation-n.rotation)<1e-9);for(const k of ['x','y'])assert(Math.abs(p.pos[k]-n.pos[k])<1e-7)}}
}
console.log(`${combined?'Combined explosion/burn/pop/particle health and RNG: ':''}${rows.length} original main/particle traces / ${frames} frames / ${particles} particle samples: queued insertion, strict30/s emission/interpolation,60FPS frames, rotation, lifetime/draws, source removal and lingering cleanup`)
