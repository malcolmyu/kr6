import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {BoltMotion} from '../src/game/BoltMotion.ts'
import {GameSession} from '../src/game/GameSession.ts'
const templates=JSON.parse(readFileSync('public/data/entities.json'))
assert.equal(templates.bolt_tower_wizard_lvl1.initial_impulse_angle_abs,Math.PI/2,'Preserve the original entity template double; 14-digit JSON changes crossing-particle painter order')
const traces=JSON.parse(readFileSync('analysis/bolt-oracle.json'))
let count=0
for(const trace of traces) {
 const pos={x:0,y:0},motion=new BoltMotion(templates.bolt_tower_wizard_lvl1,pos,trace.to)
 for(const [frame,expected] of trace.frames.entries()) {
  const done=motion.step(pos,trace.to,frame/30,1/30)
  assert(Math.hypot(pos.x-expected.pos.x,pos.y-expected.pos.y)<1e-7,`position mismatch frame ${frame} to ${JSON.stringify(trace.to)}`)
  assert(Math.hypot(motion.velocity.x-expected.velocity.x,motion.velocity.y-expected.velocity.y)<1e-7,`velocity mismatch frame ${frame}`)
  assert.equal(done,expected.done);count++
 }
}
console.log(`${count} original LuaJIT bolt flight frames: position, velocity and arrival match`)
const read=name=>JSON.parse(readFileSync(`public/data/${name}.json`)),results=[]
for(const steps of [[40],Array(1200).fill(1/30)]) {
 const game=new GameSession(read('level01'),read('level01-campaign'),templates,()=>.5,'campaign',['archers','knights','catapult','wizard'])
 let kills=0;game.onCommand=c=>{if(c.name==='signal'&&c.signal_name==='got-enemy-gold')kills++}
 const sounds=[],effects=[];game.onSound=name=>sounds.push(name);game.combat.onEffect=name=>effects.push(name)
 game.build('6','wizard');game.advance(1)
 game.waves.callNextWave()
 for(const dt of steps)game.advance(dt)
 assert(kills>0,'Tracking bolts must emit actual kill rewards even after corpse removal')
 assert(game.gold>75,'Wizard kills must award gold')
 assert(sounds.filter(s=>s==='TowerScholarMageBasicAttack').length>=2)
 assert(effects.includes('fx_tower_wizard_bolt_hit'))
 results.push({kills,hp:game.enemies.map(e=>e.hp),gold:game.gold})
}
assert.deepEqual(results[0],results[1])
console.log('Wizard paired bolts: original enemy kills, sound events, gold and fixed-step determinism verified')
