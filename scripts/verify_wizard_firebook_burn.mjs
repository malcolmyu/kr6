import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/wizard-firebook-burn-oracle.json')
let frames=0
for(const row of rows){
 const {level,kind}=row,e={id:1,hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:500,y:350},{x:900,y:350}])};let calls=0
 if(kind==='vis-ban')e.template.vis.bans|=16388;if(kind==='immune')e.template.health.immune_to=1;if(kind==='ignore')e.template.health.ignore_damage=true
 const c=new RangedCombat(templates,()=>{calls++;return .25},()=>{})
 for(let tick=1;tick<=row.frames.length;tick++){
  const n=row.frames[tick-1]
  if(tick===1)c.firebook.queue(e,level)
  if(tick===31&&kind==='refresh')c.firebook.queue(e,level)
  if(tick===31&&kind==='upgrade'&&level<3)c.firebook.queue(e,level+1)
  if(tick===31&&kind==='lower'&&level>1)c.firebook.queue(e,level-1)
  if(tick===61&&kind==='dead'){e.hp=0;e.diedAt=n.at}
  c.advance((tick+1)*(1/30),[],tick>=61&&kind==='removed'?[]:[e])
  const context=`${level}/${kind}/${tick}`,actual=c.firebook.burns.toSorted((a,b)=>a.level-b.level)
  assert.equal(e.hp,n.hp,context+'/HP');assert.equal(calls,n.calls,context+'/RNG');assert.equal(actual.length,n.burns.length,context+'/mod count')
  for(const [i,b]of actual.entries())for(const key of ['level','at','spriteAt','dpsTs'])assert(Math.abs(b[key]-n.burns[i][key])<1e-8,context+`/${key} ${b[key]}/${n.burns[i][key]}`)
  frames++
 }
}
console.log(`${rows.length} original firebook mod/DPS cases / ${frames} frames: original4s duration, quarter-second integer damage/draws, same-level refresh, stronger replacement/lower rejection, dead/removed targets, modifier bans and health immunity/ignore`)
