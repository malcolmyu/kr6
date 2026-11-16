import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BuyAvailableSystem,buyAvailableHidden,buyAvailablePulse} from '../src/game/BuyAvailable.ts'
import {TowerSystem} from '../src/game/TowerSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),native=read('analysis/buy-available-oracle.json'),templates=read('public/data/entities.json')
for(const [i,row]of native.rows.entries())assert.equal(buyAvailableHidden(row.target,row.gold,row.minCost,row.hide,row.locked,templates),row.hidden,`native visibility case${i}/${row.target.template_name}/${row.gold}`)
for(const [i,row]of native.pulse.entries()){
 const actual=buyAvailablePulse(row.time,2*(1/30))
 for(const [a,b]of [[actual.alpha,row.alpha],[actual.scale.x,row.scale.x],[actual.scale.y,row.scale.y]])assert(Math.abs(a-b)<1e-9,`native tween${i}: ${a} vs ${b}`)
}
console.log(`${native.rows.length} original buy-availability modifier conditions and ${native.pulse.length} original tween samples match: holders/builders, upgrades/locks, powers/caps, repair, click/hidden overrides and shared quad-out pulse`)

for(const row of native.controllers){
 const level={data:{entities_list:[{template:'tower_holder_terrain_1_1',pos:{x:200,y:200},'tower.holder_id':'a'},{template:'tower_archers_lvl1',pos:{x:400,y:300},'tower.holder_id':'b'}]}}
 const towers=new TowerSystem(level,'campaign',templates,row.scenario===4?['wizard','catapult']:['archers','wizard']),system=new BuyAvailableSystem(towers,templates),created=[]
 system.onCreate=(site,time)=>created.push({tick:Math.round(time*30),holder:site.id,minCost:system.minCost,animationTs:system.animationTs})
 for(const frame of row.frames){
  if(row.scenario===2&&frame.tick===3)system.forceCheck=true
  system.advance(frame.tick*(1/30),frame.gold,frame.hide)
  const states=[...system.indicators.values()].filter(s=>s.insertAt<=frame.tick*(1/30)).map(s=>({holder:s.site.id,hidden:s.hidden}))
  assert.deepEqual(states.sort((a,b)=>a.holder.localeCompare(b.holder)),(Array.isArray(frame.states)?frame.states:[]).toSorted((a,b)=>a.holder.localeCompare(b.holder)),`controller${row.scenario}/tick${frame.tick}`)
 }
 for(const actual of created){const expected=row.created.find(s=>s.holder===actual.holder);assert(expected);assert(Math.abs(actual.animationTs-expected.animationTs)<1e-12);assert.deepEqual({...actual,animationTs:0},{...expected,animationTs:0})}
 assert.equal(created.length,row.created.length)
}
console.log('Original controller: four independent100-tick per-holder timelines match initial yield, strict quarter-second polling/force flag, queued modifier insertion, shared epoch and gold/hide polling lag; global allocation order remains separate')

// Actual continuously running original stage3 iron, normal build/wave inputs.
await import('./diagnose_native_level_runtime.mjs')
const coupled=read('analysis/native-level-runtime-diagnostic.json'),byHolder=(a,b)=>a.holder.localeCompare(b.holder)
assert.equal(coupled.nativeIndicatorCreates.filter(c=>c.tick===10).length,11)
assert.deepEqual(coupled.webIndicatorCreates.filter(c=>c.tick===10).toSorted(byHolder),coupled.nativeIndicatorCreates.filter(c=>c.tick===10).toSorted(byHolder))
console.log('Coupled original stage3 iron: normal GameSession creates the same11 holder modifiers on tick10; global IDs and creation traversal order are not asserted')
