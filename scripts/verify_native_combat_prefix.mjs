import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v)
const native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),commands=read('analysis/native-runtime-smoke-input.json'),game=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
game.heroes.playerLevel=native.playerLevel;game.heroes.savedXp={hero_gerald:0,hero_zefira:0};game.powers.equip(['reinforcements','rain_of_fire','royal_edict']);game.powers.progression.configure({},native.playerLevel,3);applyStageSetup(game,3,'iron',true,true)
const prefix=1391,spawns=native.events.filter(e=>e.kind==='create'&&e.template.startsWith('enemy_'))
let actors=0,soldiers=0
const nativeSoldierCreates=native.events.filter(e=>e.kind==='create'&&e.template.startsWith('soldier_knights_lvl'))
for(const frame of native.frames.slice(0,prefix)){
 for(const c of commands.filter(c=>c.tick===frame.tick))if(c.kind==='send_wave')game.callNextWave();else game.build(c.holder,c.tower)
 game.advance(1/30)
 const context=`original combat tick${frame.tick}`,live=game.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined),original=frame.entities.filter(e=>e.template.startsWith('enemy_')&&e.node&&e.hp>0&&!frame.removals.includes(e.id))
 assert.equal(game.outcome?.kind,frame.outcome?(frame.outcome.victory?'victory':'defeat'):undefined,context+'/level-system outcome');assert.equal(game.paused,frame.paused??false,context+'/pause')
 assert.equal(game.time,frame.tick*(1/30),context+'/clock');assert.equal(game.gold,frame.gold,context+'/gold');assert.equal(game.lives,frame.lives,context+'/lives');assert.equal(game.waves.wave,frame.wave,context+'/wave');assert.equal(live.length,original.length,context+'/living actor count')
 for(const e of live){const spawned=spawns[e.id-1],n=original.find(n=>n.id===spawned?.id);assert(n,context+`/missing alive actor${e.id}`);assert.equal(e.name,n.template,context+'/template');assert.equal(e.hp,n.hp,context+`/actor${e.id}/HP`);assert.equal(e.path.ni,n.node.ni,context+'/node');assert(Math.hypot(e.path.position.x-n.pos.x,e.path.position.y-n.pos.y)<1e-7,context+'/position');actors++}
 for(const n of frame.entities.filter(e=>e.template.startsWith('enemy_')&&e.node&&e.hp>0&&frame.removals.includes(e.id))){
  const ordinal=spawns.findIndex(e=>e.id===n.id)+1,e=game.enemies.find(e=>e.id===ordinal);assert(e,context+'/escaped body retained');assert.equal(e.escapedAt,game.time,context+'/escape clock');assert.equal(e.hp,n.hp,context+'/escaped HP');assert.deepEqual(e.motionSpeed,n.motion,context+'/escaped motion stops');assert(Math.hypot(e.path.position.x-n.pos.x,e.path.position.y-n.pos.y)<1e-7,context+'/escaped position');assert(game.entities.registry.pendingRemovals.includes(game.entities.entity(e)),context+'/escaped native removal queue')
 }
 const creates=game.entities.events.filter(e=>e.kind==='create'&&e.template.startsWith('soldier_knights_lvl')),units=game.barracks.soldiers.filter(s=>s.name.startsWith('soldier_knights_lvl')&&!!game.entities.registry.entities.get(game.entities.entity(s)?.id)),originalUnits=frame.entities.filter(e=>e.template.startsWith('soldier_knights_lvl'))
 assert.equal(units.length,originalUnits.length,context+'/registered knight count')
 for(const s of units){
  const id=game.entities.entity(s).id,index=creates.findIndex(e=>e.id===id),n=originalUnits.find(e=>e.id===nativeSoldierCreates[index]?.id)
  assert(n,context+'/registered knight');assert.equal(s.hp,n.hp,context+'/knight HP');assert(Math.hypot(s.pos.x-n.pos.x,s.pos.y-n.pos.y)<1e-7,context+'/knight position')
  assert.equal(s.target?.id,n.target?spawns.findIndex(e=>e.id===n.target)+1:undefined,context+'/knight target');soldiers++
 }
}
assert.equal(Math.round(game.time*30),prefix)
console.log(`${prefix} actual GameSession ticks / ${actors} living actor states / ${soldiers} registered knight states match original same-input constant-RNG HP, position, path nodes, active counts, waves, gold and lives, including escaped body/removal queue at1390 and next-flush defeat at1391. Other animation/audio and different native inputs are outside this actor gate; full3-2/video fidelity remains unverified.`)
