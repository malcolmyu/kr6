import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(p)),game=new GameSession(read('public/data/level01.json'),{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:999999}]},read('public/data/entities.json'),()=>.5)
let tick=0
for(const row of read('analysis/simulation-clock-oracle.json')){
 game.advance((row.tick-tick)/30);tick=row.tick
 assert.equal(game.time,Number(row.time),`Native simulation tick ${row.tick}`);assert.equal(game.time,Number(row.systemTime));assert.equal(Number(row.dt),1/30)
}
console.log('Original simulation clock matches exact doubles through 6000 ticks; integer-frame time replaces cumulative drift')
