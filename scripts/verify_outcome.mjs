import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {evaluateOutcome} from '../src/game/Outcome.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {StageFlow} from '../src/game/StageFlow.ts'
const read=name=>JSON.parse(readFileSync(`public/data/${name}.json`)),templates=read('entities')
for(const [lives,stars] of [[20,3],[18,3],[17,2],[6,2],[5,1],[1,1]])assert.equal(evaluateOutcome(lives,'campaign',true,true,false).stars,stars)
assert.equal(evaluateOutcome(1,'iron',true,true,false).stars,1)
for(const gate of [[false,true,false],[true,false,false],[true,true,true]])assert.equal(evaluateOutcome(20,'campaign',...gate),undefined)
assert.equal(evaluateOutcome(0,'campaign',false,false,true).kind,'defeat')
const program={format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:1},{name:'wave',wait_time:-1},{name:'spawn',wait_time:0,spawns:[{enemy:'enemy_bandit',pi:1,spi:1}]}]}
const game=new GameSession(read('level01'),program,templates,()=>.5,'iron'),sounds=[],signals=[]
game.onSound=s=>sounds.push(s);game.onCommand=c=>{if(c.name==='signal')signals.push(c.signal_name)}
game.waves.callNextWave();game.advance(200)
assert.equal(game.lives,0);assert.equal(game.gold,templates.enemy_bandit.enemy.gold)
assert.equal(game.outcome.kind,'defeat');assert.equal(game.enemies.length,1)
assert(game.enemies[0].escapedAt!==undefined);assert.equal(game.enemies[0].diedAt,undefined)
assert(sounds.includes('GUILooseLife'));assert(sounds.includes('GUIStageDefeat'))
assert(signals.includes('all_enemies_died'))
const time=game.time;game.paused=false;game.advance(10);assert.equal(game.time,time)
const empty={format:'tsv',commands:[{name:'gold',value:175},{name:'lives',value:20},{name:'wave',wait_time:-1}]}
const victory=new GameSession(read('level01'),empty,templates)
victory.waves.callNextWave();victory.advance(1)
assert(victory.waves.finished);assert.equal(victory.outcome,undefined,'Wave completion alone cannot bypass unfinished level script')
victory.levelScriptComplete=true;victory.advance(1/30)
assert.deepEqual(victory.outcome,{kind:'victory',stars:3,lives:20})
console.log('Original goal rewards, life loss, defeat freeze, empty-enemy signal, victory gates and star thresholds verified')
const first=new StageFlow(1,'campaign')
assert.equal(first.advance(10,true,false,false),false,'First campaign cannot silently skip its unfinished tutorial')
assert.equal(first.advance(10,true,false,true),false)
assert.equal(first.advance(11.99,true,false,true),false)
assert.equal(first.advance(12,true,false,true),true,'Original first-stage final wait is two seconds')
const second=new StageFlow(2,'campaign')
assert.equal(second.advance(0,false,false,false),false)
assert.equal(second.advance(1,true,true,false),false)
assert.equal(second.advance(2,true,false,false),true)
assert.equal(new StageFlow(3,'iron').advance(0,false,true,false),true,'Stage 3 has no level update script; global waves/enemy gates still apply')
console.log('Original stage-script completion: stage-one delay/tutorial gate, stage-two clear and stage-three no-script behavior verified')
const chained={format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'spawn',spawns:[{enemy:'enemy_bandit',pi:1,spi:1}]},{name:'wait_signal',signal_name:'all_enemies_died',wait_time:-1},{name:'spawn',spawns:[{enemy:'enemy_bandit',pi:1,spi:1}]}]}
const gated=new GameSession(read('level01'),chained,templates,()=>.5)
gated.levelScriptComplete=true;gated.waves.callNextWave();gated.advance(30)
assert.equal(gated.enemies.length,2)
assert.equal(gated.outcome,undefined,'A clear signal that spawns enemies cannot trigger premature victory')
gated.advance(100)
assert.equal(gated.outcome.kind,'victory');assert.equal(gated.lives,18)
console.log('Signal-triggered final enemy group must clear before victory')
