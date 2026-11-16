import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),commands=read('analysis/native-runtime-smoke-input.json'),g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const isPop=e=>e.template.startsWith('pop_'),original=native.events.filter(isPop),created=original.filter(e=>e.kind==='create')
let samples=0
for(const f of native.frames.slice(0,1390)){
 for(const c of commands.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
 g.advance(1/30)
 const actual=g.barracks.dodges.pops.filter(p=>g.entities.registry.entities.get(g.entities.entity(p)?.id)),expected=f.entities.filter(isPop),creates=g.entities.events.filter(e=>e.kind==='create'&&isPop(e)),context=`actual native pop tick${f.tick}`
 assert.equal(actual.length,expected.length,context+'/registered count')
 for(const p of actual){
  const id=g.entities.entity(p).id,index=creates.findIndex(e=>e.id===id),n=expected.find(e=>e.id===created[index]?.id)
  assert(n,context+'/registered identity');assert.equal(p.name,n.template,context+'/template');assert.equal(p.frame,n.animation,context+'/atlas frame');assert.deepEqual(p.pos,n.pos,context+'/position');assert(Math.abs(p.rotation-n.rotation)<1e-12,context+'/rotation');samples++
 }
}
const web=g.entities.events.filter(isPop),webIds=web.filter(e=>e.kind==='create').map(e=>e.id),ids=created.map(e=>e.id),canonical=(events,ids)=>events.filter(e=>e.tick<=1390).map(e=>({tick:e.tick,kind:e.kind,name:e.template,serial:ids.indexOf(e.id)}))
assert.deepEqual(canonical(web,webIds),canonical(original,ids))
assert(web.length>0)
console.log(`Actual GameSession ${webIds.length} native pop creations / ${samples} registered pop states through1390 match all insertion/removal events, selected atlas frames, positions and rotations; global IDs after585 and other missing entity families remain outside this gate`)
