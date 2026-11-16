import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
const read=name=>JSON.parse(readFileSync(name)),templates=read('public/data/entities.json'),level=read('public/data/level01.json'),oracle=read('analysis/early-wave-oracle.json')
for(const row of oracle.waves) {
 const game=new GameSession(level,{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wave',wait_time:row.duration}]},templates)
 game.callNextWave();game.advance(1/30);game.powers.readyAt.rain_of_fire=100
 game.advance(row.actual);game.callNextWave()
 assert.equal(game.gold,row.reward)
 game.advance(1/30);assert.equal(game.waves.wave,2)
 assert.equal(game.powers.readyAt.rain_of_fire,row.reward>1?100-row.reward:100)
}
for(const row of oracle.powers){const game=new GameSession(level,{format:'tsv',commands:[]},templates);game.powers.readyAt.rain_of_fire=100;game.powers.earlyWaveBonus(row.remaining,0);assert.equal(game.powers.readyAt.rain_of_fire,row.start_ts)}
console.log('Original TSV wave command and PowerButton oracle: rounded early gold, >1s cooldown bonus and near-expiry edge cases match')
const crow=new GameSession(level,{format:'tsv',commands:[{name:'wave',wait_time:-1},{name:'spawn',spawns:[{enemy:'enemy_crow',pi:1,spi:1},{enemy:'enemy_bandit',pi:2,spi:1}]}]},templates)
assert.deepEqual(crow.incomingWave.paths,[1,2]);assert.deepEqual(crow.incomingWave.flyingPaths,[1])
console.log('Incoming reports distinguish original flying flags by template visibility flags')
