import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {WizardBookMotion} from '../src/game/WizardBookMotion.ts'
const read=p=>JSON.parse(readFileSync(p)),rows=read('analysis/wizard-copies-motion-oracle.json'),config=read('public/data/entities.json').bullet_skill_c_wizard_1.bullet;let frames=0
const near=(a,b,ctx)=>assert(Math.abs(a-b)<1e-8,`${ctx}: ${a} != ${b}`)
for(const row of rows){let calls=0;const m=new WizardBookMotion(row.from,{x:row.from.x+row.delta.x,y:row.from.y+row.delta.y},row.velocity,config,()=>{calls++;return row.roll}),ctx=`${row.birth}/${row.delta.x}/${row.delta.y}/${row.velocity.x}/${row.velocity.y}/${row.roll}`
 near(m.duration,row.initial.duration,ctx+'/duration');near(m.aim.x,row.initial.to.x,ctx+'/aim x');near(m.aim.y,row.initial.to.y,ctx+'/aim y');near(m.speed.x,row.initial.speed.x,ctx+'/speed x');near(m.speed.y,row.initial.speed.y,ctx+'/speed y');assert.equal(calls,row.initial.calls,ctx+'/insert RNG')
 for(const f of row.frames){const hit=m.step(f.tick*(1/30)-row.birth*(1/30),1/30,f.target);assert.equal(hit,f.payload,ctx+'/impact '+f.tick);near(m.pos.x,f.pos.x,ctx+'/x '+f.tick);near(m.pos.y,f.pos.y,ctx+'/y '+f.tick);near(m.rotation,f.rotation,ctx+'/rotation '+f.tick);frames++}
}
console.log(`${rows.length} original thrown-book traces / ${frames} frames: distance-derived duration, moving target prediction and error RNG, trajectory/rotation and native early-contact/payload tick match`)
