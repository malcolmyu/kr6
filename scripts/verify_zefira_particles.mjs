import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroRangedCombat} from '../src/game/HeroRangedCombat.ts'
import {HomingBoltMotion} from '../src/game/HomingBoltMotion.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/zefira-particles-oracle.json')
let frames=0,particles=0
for(const row of rows){
 let calls=0;const random=()=>{calls++;return row.roll==='sequence'?[.01,.91,.19,.81,.39,.61,.59,.41][(calls-1)%8]:row.roll},r=new HeroRangedCombat(templates,random,()=>{})
 const template=structuredClone(templates.enemy_bandit);template.unit.hit_offset={x:0,y:0}
 const enemy={id:123,hp:1000,template,path:new PathFollower([row.to,{x:1200,y:350}])},b=templates.bullet_zefira.bullet
 r.queuedProjectiles.push({id:-1,name:'bullet_zefira',born:row.birth/30,queuedAt:row.birth/30,pos:{x:500,y:390},to:{...row.to},rotation:0,target:enemy,tracking:true,motion:new HomingBoltMotion(b),damage:[4,12]})
 for(const [i,n]of row.frames.entries()){
  const tick=i+1,time=(row.birth+tick)*(1/30),ctx=`${row.birth}/${row.to.x},${row.to.y}/${row.roll}/${row.kind}/${tick}`
  if(row.kind==='removed'&&tick===5)r.projectiles.length=0
  if(row.kind==='moving')enemy.path.position.x=row.to.x+(tick-1)*40/30
  r.beginTick(time);r.advanceProjectiles(time,1/30,[enemy]);r.advanceParticles(time)
  const t=r.trails.trails[0],actual=t?.particles??[]
  assert.equal(calls,n.calls,ctx+'/RNG');assert.equal(!!t,n.emitter,ctx+'/emitter');assert.equal(actual.length,n.particles.length,ctx+'/particles')
  if(t){assert.equal(t.emit,n.emit,ctx+'/emit');assert(Math.abs(t.emitTs-n.emitTs)<1e-9,ctx+'/emitTs');assert(Math.abs(t.at-n.emitterAt)<1e-9)}
  for(const [j,p]of actual.entries()){const q=n.particles[j];for(const k of ['at','lifetime','rotation','alpha','drawOrder'])assert(Math.abs(p[k]-q[k])<1e-8,ctx+`/particle${j}/${k} ${p[k]}/${q[k]}`);for(const k of ['x','y']){assert(Math.abs(p.pos[k]-q.pos[k])<1e-7,ctx+'/position');assert(Math.abs(p.scale[k]-q.scale[k])<1e-10,ctx+'/scale')}assert.equal(p.frame,q.frame,ctx+'/frame');particles++}
  frames++
 }
}
console.log(`${rows.length} native Zefira projectile/particle traces, ${frames} frames and ${particles} particle samples match emission, tracked movement/direction, RNG, animation, expiry and source-removal cleanup`)
