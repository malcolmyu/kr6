import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/gerald-rally-attack-oracle.json');let frames=0
for(const row of rows){
 const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),templates,()=>.25,'iron');applyStageSetup(g,3,'iron',true,true)
 const h=g.heroes.gerald;Object.assign(h.pos,{x:500,y:350});h.rally={...h.pos};h.center={...h.pos};h.born=row.birth*(1/30);h.deployUntil=h.born;h.rallyImmunity=17
 // Isolate the actual own-main post-hit continuation already reached in the
 // ordinary campaign repro; enemy damage/attack selection are covered elsewhere.
 h.attack={startedAt:(row.birth+1)*(1/30),nextHit:1,attack:h.template.melee.attacks[1],targetId:1000};h.meleeVisual={name:'attack_2',at:h.attack.startedAt}
 for(const f of row.frames){const time=f.tick*(1/30);if(f.command)assert(g.heroes.moveGerald(f.command));const interrupted=g.heroes.prepareGeraldRally(time);if(!interrupted&&h.deploying)g.barracks.advanceGeraldRally(h,time,1/30)
  const ctx=`${row.birth}/${f.tick}`;assert(Math.abs(h.pos.x-f.pos.x)<1e-9&&Math.abs(h.pos.y-f.pos.y)<1e-9,ctx+'/next actual tick movement');assert.equal(h.template.vis.bans,f.bans,ctx+'/protection');assert.equal(h.rallyImmunity??h.template.health.immune_to,f.immune,ctx+'/immunity');frames++
 }
}
console.log(`${rows.length} original post-hit Gerald attack/rally continuations / ${frames} frames: one actual tick yield at all30 tick residues over two epochs, position and protection match`)
