import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {consumeHeroXp,heroLevel,heroXpFraction} from '../src/game/HeroProgression.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {parseProgress,recordHeroXp,recordVictory,playerLevel} from '../src/game/ProgressStore.ts'
const read=p=>JSON.parse(readFileSync(p))
for(const row of read('analysis/hero-progression-oracle.json')) {
  const h={level:row.input[0],xp:row.input[1],xpQueued:row.input[2]}
  assert.equal(consumeHeroXp(h,row.stage,row.mode,2,row.playerLevel),row.changed)
  assert.deepEqual(h,{level:row.level,xp:row.xp,xpQueued:row.queued})
}
assert.equal(playerLevel(parseProgress(null)),1)
assert.equal(playerLevel({levels:{1:{campaign:3}}}),2)
assert.equal(playerLevel({levels:{1:{campaign:3},2:{campaign:2}}}),3)
assert.equal(playerLevel({levels:{1:{campaign:3},2:{campaign:2},3:{campaign:1,iron:true}}}),4)
const templates=read('public/data/entities.json'),level=read('public/data/level01.json'),program=read('public/data/level01-campaign.json')
for(const row of read('analysis/hero-stats-oracle.json')) {
  const g=new GameSession(level,program,templates,()=>.5)
  const threshold=[0,1000,4000,8500,15000,22000,30000,40000,52000,72000][row.level-1]
  g.heroes.savedXp={[row.name]:threshold}
  const h=g.heroes.insert(row.name,{x:300,y:300},0)
  assert.equal(heroLevel(threshold),row.level)
  assert.equal(h.level,row.level);assert.equal(h.hp,row.hp);assert.equal(h.template.health.armor,row.armor);assert.equal(h.template.regen.health,row.regen)
  assert.deepEqual([h.template.melee.attacks[0].damage_min,h.template.melee.attacks[0].damage_max],row.melee)
  if(row.ranged)assert.deepEqual(h.rangedDamage,row.ranged)
}
const g=new GameSession(level,program,templates,()=>.5),sounds=[]
g.heroes.onSound=n=>sounds.push(n)
const h=g.heroes.insertGerald({x:300,y:300},0);h.hp=1;h.xp=995;h.xpQueued=10
// An ongoing melee animation yields before consuming XP, as in the native loop.
h.attack={startedAt:0,nextHit:0,attack:h.template.melee.attacks[0],targetId:1}
g.heroes.advance(1);assert.equal(h.level,1)
h.attack=undefined;g.heroes.advance(2)
assert.equal(h.level,2);assert.equal(h.xp,1005);assert.equal(h.hp,240);assert.equal(h.template.health.armor,.1)
assert.equal(h.visualOverride.name,'level_up');assert(h.scriptLocked);assert(sounds.includes('HeroLevelUp'))
g.heroes.advance(2+h.template.webAnimationDurations.level_up)
assert(!h.scriptLocked);assert.equal(h.visualOverride,undefined)
assert.equal(heroXpFraction(2,2500),.5);assert.equal(heroXpFraction(10,72000),1)
let p=recordHeroXp(parseProgress(null),g.heroes.team)
p=recordVictory(p,1,'campaign',{kind:'victory',stars:3})
p=parseProgress(JSON.stringify(p));assert.equal(p.heroes.hero_gerald,1005);assert.equal(p.levels[1].campaign,3)
assert.deepEqual(parseProgress('{"heroes":{"hero_gerald":-1,"hero_zefira":"42"}}'),{levels:{}})
assert.equal(recordHeroXp(p,[{name:'hero_gerald',xp:1}]).heroes.hero_gerald,1005)
// Real melee and ranged damage must queue unrounded XP, including overkill.
for(const name of ['hero_gerald','hero_zefira']) {
  const game=new GameSession(level,program,templates,()=>.5)
  const unit=game.heroes.insert(name,{x:500,y:350},0)
  const target={id:100,name:'enemy_bandit',born:0,age:0,hp:1,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:600,y:350},{x:900,y:350}])}
  if(name==='hero_gerald') {
    game.barracks.soldierAttack(unit,target,0)
    game.barracks.soldierAttack(unit,target,.5)
    assert.equal(unit.xpQueued,12)
  }else {
    for(let frame=0;frame<30 && target.hp>0;frame++)game.heroes.advanceCombat(frame/30,1/30,[target])
    assert(target.hp<=0);assert.equal(unit.xpQueued,8*.8)
  }
  assert.equal(unit.xp,0,'Damage queues XP before the hero coroutine consumes it')
  unit.attack=undefined;unit.rangedUntil=undefined;game.heroes.advance(2)
  assert.equal(unit.xp,name==='hero_gerald'?12:6)
}
console.log('Hero XP: 252 native queue/multiplier cases, 20 native stat levels, animation gate and persistent save verified')
