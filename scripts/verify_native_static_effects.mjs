import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),commands=read('analysis/native-runtime-smoke-input.json'),g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const original=native.events.filter(e=>g.staticEffects.accepts(e.template)),created=original.filter(e=>e.kind==='create')
let samples=0
for(const f of native.frames.slice(0,1390)){
 for(const c of commands.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
 g.advance(1/30)
 const actual=g.staticEffects.models.filter(m=>g.entities.registry.entities.get(g.entities.entity(m).id)),expected=f.entities.filter(e=>g.staticEffects.accepts(e.template)),creates=g.entities.events.filter(e=>e.kind==='create'&&g.staticEffects.accepts(e.template)),context=`actual native static effect tick${f.tick}`
 assert.equal(actual.length,expected.length,context+'/registered count')
 for(const m of actual){const index=creates.findIndex(e=>e.id===g.entities.entity(m).id),n=expected.find(e=>e.id===created[index].id);assert(n,context+'/identity');assert.equal(m.name,n.template,context+'/template');assert.deepEqual(m.pos,n.pos,context+'/position');assert.equal(m.at,n.spriteTs,context+'/sprite clock');assert(Math.abs(m.sprites[0].alpha-n.spriteAlpha)<1e-8,context+'/native alpha');samples++}
}
const web=g.entities.events.filter(e=>g.staticEffects.accepts(e.template)),ids=created.map(e=>e.id),webIds=web.filter(e=>e.kind==='create').map(e=>e.id),canonical=(events,ids)=>events.filter(e=>e.tick<=1390).map(e=>({tick:e.tick,kind:e.kind,serial:ids.indexOf(e.id),name:e.template}))
assert.deepEqual(canonical(web,webIds),canonical(original,ids));assert(samples>0)
console.log(`Actual GameSession ${webIds.length} native static effect creations / ${samples} registered states through1390 match position, creation clock, alpha and every insertion/removal event; whole-runtime global ID parity is checked separately`)
