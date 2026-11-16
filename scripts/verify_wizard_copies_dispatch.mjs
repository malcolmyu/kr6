import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/wizard-copies-motion-oracle.json');let frames=0,hits=0
for(const row of rows){const c=new RangedCombat(templates,()=>row.roll,()=>{}),e={id:1,name:'enemy_bandit',hp:5000,template:structuredClone(templates.enemy_bandit),motionSpeed:row.velocity,path:{position:{x:row.from.x+row.delta.x,y:row.from.y+row.delta.y},finished:false}},payloads=[];e.template.unit.hit_offset={x:0,y:0};c.onCopiesPayload=(pos,level,time)=>payloads.push({pos,level,time})
 c.wizardTowers.onCopies({id:'source'},'bullet_skill_c_wizard_1',row.from,{...e.path.position},e.id,2,50,50,(row.birth-1)*(1/30))
 for(const f of row.frames){e.path.position={...f.target};c.advance(f.tick*(1/30),[],[e]);const p=c.projectiles[0],ctx=`${row.birth}/${row.delta.x}/${row.delta.y}/${row.velocity.x}/${row.velocity.y}/${row.roll}/${f.tick}`;assert(p,ctx+'/retained projectile');assert(Math.abs(p.pos.x-f.pos.x)<1e-8&&Math.abs(p.pos.y-f.pos.y)<1e-8,ctx+'/position');assert.equal(payloads.length,f.payload?1:0,ctx+'/payload tick');assert.equal(e.hp,5000-f.damage,ctx+'/health');frames++}
 assert.equal(payloads.length,1);assert.equal(payloads[0].level,2);assert(Math.abs(payloads[0].pos.x-row.initial.to.x)<1e-8&&Math.abs(payloads[0].pos.y-row.initial.to.y)<1e-8);assert(c.firebookTrails.trails.every(t=>!t.emit),'Original impact stops paper emission');if(e.hp<5000)hits++
}
console.log(`${rows.length} actual copies projectile dispatches / ${frames} frames: queued insertion, target prediction, first-book trajectory and health, always-once bounce payload including misses, captured level and stopped paper emission match original (${hits} hits)`)
