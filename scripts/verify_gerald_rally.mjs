import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),rows=read('analysis/gerald-rally-oracle.json'),templates=read('public/data/entities.json');let frames=0
for(const row of rows){
 const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),templates,()=>.5,'iron');applyStageSetup(g,3,'iron',true,true)
 const h=g.heroes.gerald;Object.assign(h.pos,{x:500,y:350});h.rally={...h.pos};h.center={...h.pos};h.born=row.birth/30;h.deployUntil=h.born;h.rallyImmunity=17
 for(const f of row.frames){const time=f.tick*(1/30);if(f.command)assert(g.heroes.moveGerald(f.command));const interrupted=g.heroes.prepareGeraldRally(time);assert(!interrupted);if(h.deploying)g.barracks.advanceGeraldRally(h,time,1/30)
  const context=`birth${row.birth}/distance${row.distance}/retarget${row.interrupt}/${f.tick}`;assert(Math.abs(h.pos.x-f.pos.x)<1e-9&&Math.abs(h.pos.y-f.pos.y)<1e-9,context+'/position');assert.equal(h.template.vis.bans,f.bans,context+'/visibility');assert.equal(h.rallyImmunity??h.template.health.immune_to,f.immune,context+'/immunity');frames++
 }
}
console.log(`${rows.length} original Gerald ordinary rally traces/${frames} frames: position, walking protection, final-step yield, zero-distance and in-flight retarget restore/reapply across three clock origins match`)
