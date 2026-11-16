import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GameSession } from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(`public/data/${p}.json`))
const templates=read('entities')
const traces=[]
for(const steps of [[2.8],Array(28).fill(.1)]) {
 const game=new GameSession(read('level01'),read('level01-campaign'),templates,()=>.5)
 assert.equal(game.gold,175); assert.equal(game.lives,20)
 game.callNextWave()
 for(const step of steps)game.advance(step)
 assert.equal(game.enemies.length,1,'native waits and insertion queue retain the second spawn until a later tick')
 game.advance(.1);assert.equal(game.enemies.length,2)
 traces.push(game.enemies.map(e=>({...e.path.position})))
 game.paused=true
 const time=game.time;game.advance(50);assert.equal(game.time,time)
}
traces[0].forEach((p,i)=>assert(Math.hypot(p.x-traces[1][i].x,p.y-traces[1][i].y)<1e-7))
for(let level=1;level<=3;level++)for(const mode of ['campaign','iron']) {
 const game=new GameSession(read(`level0${level}`),read(`level0${level}-${mode}`),templates,()=>.5)
 game.callNextWave();game.advance(25)
 assert(game.enemies.length>0)
 for(const e of game.enemies)assert(Number.isFinite(e.hp) && Number.isFinite(e.path.position.x) && (e.hp>0 || e.diedAt!==undefined))
}
console.log('All six sessions: original enemy templates, timed movement and pause verified')
const construction=new GameSession(read('level01'),read('level01-campaign'),templates)
assert.equal(construction.towers.sites.length,7)
construction.build('2','archers')
assert.equal(construction.gold,105)
assert.throws(()=>construction.build('2','archers'))
assert.equal(construction.gold,105)
construction.advance(.8)
assert.equal(construction.towers.sites.find(s=>s.id==='2').tower,undefined)
construction.advance(3/30);assert.equal(construction.towers.sites.find(s=>s.id==='2').tower,undefined)
construction.advance(1/30)
assert.equal(construction.towers.sites.find(s=>s.id==='2').tower,'tower_archers_lvl1')
const iron=new GameSession(read('level01'),read('level01-iron'),templates,()=>.5,'iron')
const gold=iron.gold
assert.throws(()=>iron.build('2','wizard'))
assert.equal(iron.gold,gold)
console.log('Original construction price, duration, occupied sites and iron restrictions verified')
const combatTraces=[]
for(const steps of [[40],Array(1200).fill(1/30)]) {
 const game=new GameSession(read('level01'),read('level01-campaign'),templates,()=>.5)
 let kills=0;game.onCommand=c=>{if(c.name==='signal'&&c.signal_name==='got-enemy-gold')kills++}
 game.build('6','archers');game.advance(1)
 game.callNextWave()
 for(const step of steps)game.advance(step)
 assert(kills>0,'Archer shots must emit actual kill rewards; removed corpses must not be required to stay in the enemy list')
 assert(game.gold>105,'Kills must award original gold')
 combatTraces.push({gold:game.gold,kills,hp:game.enemies.map(e=>e.hp)})
}
assert.deepEqual(combatTraces[0],combatTraces[1])
console.log('Archer attack chain, lethal hits, original gold rewards and 30 FPS determinism verified')
