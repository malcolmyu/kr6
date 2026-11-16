import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=path=>JSON.parse(readFileSync(path),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v)
const native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),input=read('analysis/native-runtime-smoke-input.json'),game=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
game.heroes.playerLevel=native.playerLevel;game.heroes.savedXp={hero_gerald:0,hero_zefira:0};game.powers.equip(['reinforcements','rain_of_fire','royal_edict']);applyStageSetup(game,3,'iron',true,true)
const expected=new Map(),known=new Set()
for(const event of native.events.filter(e=>e.kind==='create'&&e.template.startsWith('enemy_'))){
 const first=native.frames.find(frame=>frame.entities.some(e=>e.id===event.id));if(!first)continue
 const entry=first.entities.find(e=>e.id===event.id);assert.equal(first.tick,event.tick+1,'native wave entity queued until next insertion phase')
 const list=expected.get(first.tick)??[];list.push(entry);expected.set(first.tick,list)
}
let frames=0,spawns=0,walkingSamples=0;const mapping=[]
for(const frame of native.frames){
 for(const command of input.filter(c=>c.tick===frame.tick))if(command.kind==='send_wave'){
  const wave=game.waves.wave,count=game.enemies.length;game.callNextWave();game.callNextWave();assert.equal(game.waves.wave,wave,'GUI summon consumed by wave phase');assert.equal(game.enemies.length,count);assert.equal(game.incomingWave,undefined)
 }else game.build(command.holder,command.tower)
 game.advance(1/30)
 for(const command of input.filter(c=>c.kind==='build'&&c.tick<=frame.tick)){
  const site=game.towers.sites.find(s=>s.id===command.holder),actor=frame.entities.find(e=>e.template.startsWith('tower_')&&e.pos?.x===site.pos.x&&e.pos?.y===site.pos.y)
  const visual=site.building&&game.time>=site.buildStartsAt?site.building:site.tower??site.holder
  assert.equal(visual,actor.template,`${frame.tick}/${site.id}/native holder→construction→finished tower`)
 }
 const added=game.enemies.filter(e=>!known.has(e.id)),actualNative=expected.get(frame.tick)??[]
 assert.equal(added.length,actualNative.length,`${frame.tick}/inserted count`)
 for(const [i,e]of added.entries()){
  const n=actualNative[i];assert.equal(e.name,n.template,`${frame.tick}/type`);assert.equal(e.path.pi,n.node.pi);assert.equal(e.path.spi,n.node.spi);assert.equal(e.path.ni,n.node.ni)
  assert(Math.hypot(e.path.position.x-n.pos.x,e.path.position.y-n.pos.y)<1e-9,`${frame.tick}/first walking step`);known.add(e.id);mapping.push({web:e,native:n.id,born:frame.tick});spawns++
 }
 for(const entry of mapping)if(frame.tick-entry.born<30){
  const n=frame.entities.find(e=>e.id===entry.native),e=entry.web;assert(n)
  assert.equal(e.path.ni,n.node.ni,`${frame.tick}/${n.id}/first-second node`);assert(Math.hypot(e.path.position.x-n.pos.x,e.path.position.y-n.pos.y)<1e-9,`${frame.tick}/${n.id}/first-second walking`);walkingSamples++
 }
 frames++;if(game.outcome)break
}
assert.equal(spawns,native.events.filter(e=>e.kind==='create'&&e.template.startsWith('enemy_')).length,'all native smoke-fixture enemies covered');assert(frames>=1300)
console.log(`${frames} coupled GameSession ticks: ${spawns} actual native spawns match type/lane/node/insertion tick/first movement and ${walkingSamples} first-second walking samples; five holder→construction→tower timelines match every tick; GUI summons defer and duplicates are blocked. Full damage/outcome parity remains open.`)
