import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {CatapultMotion,ellipseDistanceFactor,catapultDamage} from '../src/game/CatapultMotion.ts'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),oracle=read('analysis/catapult-oracle.json')
let count=0
for(const row of oracle.flights) {
 const m=new CatapultMotion(row.from,row.to,templates.bullet_catapult_lvl1.bullet)
 assert.deepEqual(m.speed,row.speed)
 for(const [frame,sample] of row.frames.entries()) {
  assert.equal(m.step(frame/30,1/30),sample.done)
  assert(Math.hypot(m.pos.x-sample.pos.x,m.pos.y-sample.pos.y)<1e-8)
  assert(Math.abs(m.rotation-sample.r)<1e-9);assert.equal(m.hidden,sample.hidden);count++
 }
}
for(const row of oracle.damage) {
 const b=templates[row.name].bullet
 for(const sample of row.factors)assert(Math.abs(ellipseDistanceFactor({x:500+sample.offset[0],y:350+sample.offset[1]},{x:500,y:350},b.damage_radius)-sample.value)<1e-12)
 for(const sample of row.hits)assert.equal(catapultDamage(b.damage_min,b.damage_max,b.damage_factor,{x:500+sample.offset[0],y:350+sample.offset[1]},{x:500,y:350},b.damage_radius),sample.value)
 // Run the actual combat AoE path, with each native boundary sample present.
 const enemies=row.factors.map((sample,i)=>({id:i+1,name:sample.name,hp:1000,born:0,age:0,template:structuredClone(templates[sample.name]),path:new PathFollower([{x:500+sample.offset[0],y:350+sample.offset[1]},{x:1000,y:350}])}))
 const combat=new RangedCombat(templates,()=>.5,()=>{}),effects=[]
 combat.onEffect=name=>effects.push(name)
 const motion=new CatapultMotion({x:400,y:400},{x:500,y:350},b)
 combat.projectiles.push({id:1,name:row.name,born:0,duration:b.flight_time,from:{x:400,y:400},to:{x:500,y:350},pos:{x:400,y:400},target:enemies[0],done:false,rotation:0,bombMotion:motion})
 for(let frame=0;frame<40 && combat.projectiles.length;frame++)combat.advance(frame/30,[],enemies)
 for(const [i,sample] of row.factors.entries()) {
  const expected=row.hits.find(h=>h.name===sample.name&&h.offset[0]===sample.offset[0]&&h.offset[1]===sample.offset[1])
  assert.equal(1000-enemies[i].hp,expected?.value??0,`${row.name} ${sample.offset}`)
 }
 assert(effects.includes('fx_catapult_hit'));assert(effects.includes('decal_bomb_crater_KR5'))
}
console.log(`${count} native catapult flight/rotation/hide frames, four levels of native ellipse damage and actual AoE boundary hits/craters verified`)

// Water uses the native splash explosion and creates no ground crater.
const water=new RangedCombat(templates,()=>.5,()=>{}),fx=[];water.cellAt=()=>2;water.onEffect=name=>fx.push(name)
const b=templates.bullet_catapult_lvl1.bullet,from={x:0,y:50},to={x:100,y:0}
water.projectiles.push({id:1,name:'bullet_catapult_lvl1',born:0,duration:1,from,to,pos:{...from},target:{},done:false,rotation:0,bombMotion:new CatapultMotion(from,to,b)})
for(let frame=0;frame<35 && water.projectiles.length;frame++)water.advance(frame/30,[],[])
assert.deepEqual(fx,['fx_explosion_water'])
