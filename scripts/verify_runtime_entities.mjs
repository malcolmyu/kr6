import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v)
const native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),inputs=read('analysis/native-runtime-smoke-input.json')
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const frames=[]
for(let tick=1;tick<=1391;tick++){
 for(const c of inputs.filter(c=>c.tick===tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
 g.advance(1/30)
 const r=g.entities.registry;frames.push({tick,nextId:r.nextId,count:r.count,max:r.max,entities:[...r.entities.values()].map(({id,template})=>({id,template})),inserts:r.pendingInserts.map(e=>e.id),removes:r.pendingRemovals.map(e=>e.id)})
}
const canonical=e=>({tick:e.tick,kind:e.kind,id:e.id,template:e.template}),events=g.entities.events.map(canonical),expected=native.events.filter(e=>e.tick<=1391).map(canonical)
let firstEventDifference,firstFrameDifference
for(let i=0;i<Math.max(events.length,expected.length);i++)if(JSON.stringify(events[i])!==JSON.stringify(expected[i])){firstEventDifference={index:i,web:events[i],native:expected[i]};break}
for(const frame of frames){const n=native.frames[frame.tick-1],expected={tick:n.tick,nextId:n.nextId,count:n.count,max:n.max,entities:n.entities.map(({id,template})=>({id,template})),inserts:n.inserts,removes:n.removals};if(JSON.stringify(frame)!==JSON.stringify(expected)){firstFrameDifference={web:frame,native:expected};break}}
writeFileSync('analysis/runtime-entities-diagnostic.json',JSON.stringify({firstEventDifference,firstFrameDifference,events,frames},null,2))
assert.equal(firstEventDifference,undefined,JSON.stringify(firstEventDifference));assert.equal(firstFrameDifference,undefined,JSON.stringify(firstFrameDifference))
assert.equal(g.outcome?.kind,'defeat');assert.equal(g.paused,true);assert.equal(g.time,1391*(1/30))
console.log('Normal GameSession:1391 coupled original ticks match actual global creation IDs, queue/insert/remove events, full Lua entity-table order, counts/max and pending queues through the entire constant-RNG1391-tick defeat fixture, including goal17 ordering and level1 defeat; no native events drive the runtime')

const starts=[{stage:1,mode:'campaign',profile:'default'},{stage:1,mode:'campaign',profile:'cleared'},{stage:1,mode:'iron',profile:'cleared'},{stage:2,mode:'campaign',profile:'entry'},{stage:2,mode:'campaign',profile:'cleared'},{stage:2,mode:'iron',profile:'entry'},{stage:3,mode:'campaign',profile:'entry'},{stage:3,mode:'iron',profile:'entry'}]
for(const row of starts){
 const original=read(`analysis/level-entity-bootstrap-${row.stage}-${row.mode}-${row.profile}-insertion.json`),game=new GameSession(read(`public/data/level0${row.stage}.json`),read(`public/data/level0${row.stage}-${row.mode}.json`),read('public/data/entities.json'),()=>.5,row.mode)
 applyStageSetup(game,row.stage,row.mode,row.stage>1||row.profile==='cleared',row.profile==='cleared')
 const runtime=game.entities;runtime.beginTick()
 const key=`${row.stage}/${row.mode}/${row.profile}`
 assert.deepEqual([...runtime.registry.entities.values()].map(({id,template})=>({id,template})),original.insertedEntities,key+'/real session first-flush table')
 assert.equal(runtime.registry.nextId,original.nextId,key+'/next ID');assert.equal(runtime.registry.count,original.count,key+'/count');assert.equal(runtime.registry.max,original.max,key+'/max')
 const operations=runtime.events.filter(e=>['create','queueInsert','queueRemove'].includes(e.kind)).map(({kind,id,template})=>({kind,id,template}))
 assert.deepEqual(operations,original.events,key+'/real setup allocation/queue callbacks')
}
console.log('Eight actual GameSession stage-entry configurations match original first insertion, including tutorial knight replacement, academy intro and three chess-controller creations')

const removed=g.enemies.find(e=>e.hp>0&&e.escapedAt===undefined),position={...removed.path.position}
g.enemies.splice(g.enemies.indexOf(removed),1);g.advance(1/30)
assert.deepEqual(removed.path.position,position,'a removed gameplay actor must not keep walking through a retained registry binding')
