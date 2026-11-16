import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
import {parseProgress,recordVictory} from '../src/game/ProgressStore.ts'
const read=n=>JSON.parse(readFileSync(`public/data/${n}.json`)),templates=read('entities')
const game=new GameSession(read('level01'),read('level01-campaign'),templates,()=>.5)
applyStageSetup(game,1,'campaign')
assert(game.tutorial.inputLocked);assert.equal(game.tutorial.waveVisible,false)
game.callNextWave();assert.equal(game.waves.wave,0)
assert.throws(()=>game.build('6','archers'))
game.advance(10)
assert.equal(game.enemies.length,4)
assert(game.enemies.every(e=>e.name==='enemy_bandit_tut' && e.hp===24 && e.frozen))
assert.equal(game.tutorial.lesson,'build-tower');assert.equal(game.tutorial.inputLocked,false)
assert.equal(game.tutorial.balloon,undefined,'Original build caption appears when the tower menu opens')
game.tutorial.openMenu(game.towers.sites.find(s=>s.id==='6'))
assert.deepEqual(game.tutorial.balloon,{id:'TB_BUILD',pos:{x:779,y:396}})
game.tutorial.closeMenu();assert.equal(game.tutorial.balloon,undefined)
const frozen=game.enemies.map(e=>({pos:{...e.path.position},animation:e.animationAge}))
game.advance(2)
assert.deepEqual(game.enemies.map(e=>({pos:e.path.position,animation:e.animationAge})),frozen)
assert.throws(()=>game.build('2','archers'));assert.throws(()=>game.build('6','wizard'))
game.build('6','archers');assert.equal(game.gold,105)
game.advance(1)
assert.equal(game.combat.damageOverrides.get('bullet_archers_lvl1'),6)
assert(game.enemies.every(e=>!e.frozen))
let sawGoldLesson=false,sawDisabledTower=false
for(let frame=0;frame<1200;frame++) {
 game.advance(1/30)
 sawGoldLesson ||= game.tutorial.balloon?.id==='TB_GOLD'
 sawDisabledTower ||= !!game.towers.sites.find(s=>s.id==='6').attackDisabled
 if(game.tutorial.canCallWave())break
}
assert(sawGoldLesson);assert(sawDisabledTower)
assert(game.enemies.every(e=>e.hp<=0));assert.equal(game.gold,125)
assert.equal(game.tutorial.balloon.id,'TB_START')
game.callNextWave();assert.equal(game.waves.wave,0,'GUI summon waits for the native wave phase');game.advance(1/30);assert.equal(game.waves.wave,1);assert.equal(game.tutorial.allHolders,true)
assert(game.tutorial.canBuild(game.towers.sites.find(s=>s.id==='2'),'wizard'))
game.advance(18.5)
assert.equal(game.tutorial.lesson,'power-reinforcement')
assert.equal(game.combat.damageOverrides.has('bullet_archers_lvl1'),false)
console.log('Original tutorial TSV: auto spawns, input/holder gates, frozen motion/animation, fixed arrow damage, gold lesson, clear gate and first wave verified')
const replay=new GameSession(read('level01'),read('level01-campaign'),templates)
applyStageSetup(replay,1,'campaign',true)
assert.equal(replay.gold,245);assert.equal(replay.tutorial,undefined)
assert.equal(replay.towers.sites.find(s=>s.id==='5').tower,undefined)
let progress=parseProgress('{"levels":{"1":{"campaign":3},"2":{"campaign":99},"3":{"iron":true}}}')
assert.deepEqual(progress,{levels:{1:{campaign:3},3:{iron:true}}})
progress=recordVictory(progress,1,'campaign',{kind:'victory',stars:1,lives:1})
assert.equal(progress.levels[1].campaign,3)
assert.deepEqual(parseProgress('invalid'),{levels:{}})
console.log('Campaign replay: original +70 gold and no tutorial barracks; persisted best stars survive lower-score replays')
