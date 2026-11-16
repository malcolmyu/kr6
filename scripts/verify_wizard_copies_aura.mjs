import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {WizardBookAuraSystem} from '../src/game/WizardBookAura.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),art=read('public/data/towers-art.json'),a=art.animations.wizardbook_land,rows=read('analysis/wizard-copies-aura-oracle.json');let frames=0,shots=0
for(const row of rows){let calls=0,time,tick,frame,removal;const events=[],system=new WizardBookAuraSystem(templates.aura_wizard_skill_c,a.to-a.from+1,()=>{calls++;return row.roll}),m=system.create({x:500,y:350},row.level)
 system.targets=()=>row.kind==='empty'||row.kind==='target-leaves'&&frame>=80?[]:[{id:1,pos:{x:590,y:360}}]
 system.onShot=s=>{shots++;events.push({tick,name:s.name,from:s.from,to:s.to,target:s.target!==undefined,min:s.min,max:s.max,calls})};system.onRemove=()=>{removal=tick;events.push({tick,remove:true,calls})}
 for(const [i,f]of row.frames.entries()){frame=i+1;tick=f.tick;time=tick*(1/30);if(removal!==undefined&&tick>removal)system.remove(m);system.advance(m,time);system.tween(m,time)
  const ctx=`${row.level}/${row.birth}/${row.kind}/${row.roll}/${tick}`;assert.equal(m.animation,f.animation,ctx+'/animation');assert.equal(m.at,f.at,ctx+'/clock');assert.equal(m.loop,f.loop,ctx+'/loop');assert(Math.abs(m.alpha-f.alpha)<1e-8,ctx+'/alpha');assert.equal(m.removed,f.removed,ctx+'/removal');assert.equal(m.pending,f.pending,ctx+'/queue');assert.equal(m.tweenAt!==undefined,f.tween,ctx+'/tween');assert.equal(m.tweenAt,f.tweenAt,ctx+'/tween clock');assert.equal(calls,f.calls,ctx+'/RNG');frames++
 }
 assert.deepEqual(events,row.events,`${row.level}/${row.birth}/${row.kind}/${row.roll}/complete events`)
}
console.log(`${rows.length} original landed-book aura traces / ${frames} frames / ${shots} shards: landing/idle/shoot clocks, strict cadence, target loss and four-roll empty scatter, level damage/count, fade/tween and queued removal match`)
