import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),inputs=read('analysis/native-runtime-smoke-input.json'),values=[.11,.83,.29,.71,.43,.59,.19,.97,.37,.61,.07,.89,.47,.53,.23,.79]
let states=0,inserts=0
for(const mode of ['constant','sequence']){
 const native=read(`analysis/level-entity-bootstrap-3-iron-entry-runtime-${mode}.json`);let calls=0
 const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>{const v=mode==='constant'?.5:values[calls%values.length];calls++;return v},'iron',['archers','knights','catapult','wizard'])
 g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
 const seen=new Set()
 for(const f of native.frames.slice(0,1391)){
  for(const c of inputs.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
  g.advance(1/30)
  if(mode==='sequence'){assert.equal(calls,f.randomBoundary,`varying RNG calls tick${f.tick}`);const r=g.entities.registry;assert.equal(r.nextId,f.nextId);assert.deepEqual([...r.entities.values()].map(({id,template})=>({id,template})),f.entities.map(({id,template})=>({id,template}))) }
  // The first cooldown persists; later discarded redraw values cannot change it.
  for(const m of g.creatures.models){const id=g.entities.entity(m).id,n=f.entities.find(e=>e.id===id),ctx=`${mode}/${f.tick}/${m.name}/${id}`;assert(n);assert.equal(m.animation,n.animation,ctx+'/animation');assert.equal(m.at,n.spriteTs,ctx+'/clock');assert.equal(g.creatures.frame(m,g.time)+1,n.ambientFrame,ctx+'/frame');states++}
  if(f.tick<=120)for(const s of g.barracks.soldiers.filter(s=>s.name.startsWith('soldier_knights_lvl'))){const e=g.entities.entity(s);if(!e||!g.entities.registry.entities.get(e.id)||seen.has(e.id))continue;seen.add(e.id);const n=f.entities.find(n=>n.id===e.id);assert.equal(s.infoKey,n.soldierInfo,`${mode}/knight name`);assert.equal(s.spritePhases[0],n.spriteTs,`${mode}/knight insertion animation phase`);inserts++}
 }
}
console.log(`Actual GameSession: ${states} native ambient animation/clock/frame states and ${inserts} knight name/sprite insertion states match; varying shared RNG/table matches through1391; actor/idle/combat state coverage is checked separately.`)
