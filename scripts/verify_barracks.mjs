import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {rallyFormation,meleeSlot} from '../src/game/UnitPositions.ts'
import {predictDamage} from '../src/game/Damage.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=name=>JSON.parse(readFileSync(`public/data/${name}.json`))
const oracle=JSON.parse(readFileSync('analysis/barracks-oracle.json'))
function close(a,b){assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-8,`${JSON.stringify(a)} != ${JSON.stringify(b)}`)}
for(const c of oracle.formations)close(rallyFormation(c.index,c.count,c.rally,c.radius,c.angle),c.pos)
for(const c of oracle.slots)close(meleeSlot(c.index,c.enemy,Number(c.angle),c.enemyOffset,c.offset),c.pos)
for(const c of oracle.damage)assert.equal(predictDamage(c.health,c.damage,true),c.expected)
console.log('Original LuaJIT oracle: 12 formations, 12 melee slots and 120 soldier damage cases match')
const traces=[]
for(const steps of [[50],Array(1500).fill(1/30)]) {
 const game=new GameSession(read('level01'),read('level01-campaign'),read('entities'),()=>.5)
 game.build('6','knights');game.advance(.8)
 assert.equal(game.barracks.soldiers.length,0)
 // Construction now includes the original queued builder/finished insertions.
 game.advance(.6)
 assert.equal(game.barracks.soldiers.length,3)
 game.advance(2.8)
 const site=game.towers.sites.find(s=>s.id==='6')
 for(const s of game.barracks.soldiers)close(s.pos,rallyFormation(s.slot,3,site.rally,25))
 game.waves.callNextWave()
 for(const step of steps)game.advance(step)
 assert(game.enemies.some(e=>e.hp<(Array.isArray(e.template.health.hp_max)?e.template.health.hp_max[1]:e.template.health.hp_max)),'Knights must damage approaching enemies; original blocker distribution can split the squad across three bandits')
 assert(game.enemies.some(e=>e.blocked),'Soldiers must stop walking enemies')
 assert.equal(game.gold,145,'This initial split-squad encounter has no kills; spending stays 245 - 100')
 traces.push({gold:game.gold,enemies:game.enemies.map(e=>({hp:e.hp,pos:e.path.position})),soldiers:game.barracks.soldiers.map(s=>({hp:s.hp,pos:s.pos}))})
 // A dead soldier occupies its barrack slot for the original corpse lifetime.
 game.enemies.length=0
 const dead=game.barracks.soldiers[0],oldId=dead.id
 dead.hp=0;dead.diedAt=game.time
 game.advance(11.9)
 assert(game.barracks.soldiers.some(s=>s.id===oldId))
 assert.equal(game.barracks.soldiers.length,3)
 game.advance(1)
 assert(!game.barracks.soldiers.some(s=>s.id===oldId))
 assert.equal(game.barracks.soldiers.length,3)
 assert(game.barracks.soldiers.every(s=>s.hp>0))
}
assert.deepEqual(traces[0],traces[1])
console.log('Barracks: door-gated three-soldier spawn, formation, blocking, melee rewards, corpse lifetime, replacement and fixed-step determinism verified')
const templates=read('entities'),duel=new GameSession(read('level01'),read('level01-campaign'),templates,()=>.5)
duel.build('6','knights');duel.advance(4)
const fighter=duel.barracks.soldiers[0]
// Isolate one knight and an unmodified original bandit, already at their melee slots.
for(const s of duel.barracks.soldiers.slice(1)){s.hp=0;s.diedAt=duel.time}
const path=new PathFollower([{x:fighter.pos.x+34,y:fighter.pos.y},{x:fighter.pos.x-200,y:fighter.pos.y}]);path.advance(0)
const bandit={id:1000,name:'enemy_bandit',born:duel.time,age:0,path,template:structuredClone(templates.enemy_bandit),hp:40}
// This hit-time fixture starts with a ready enemy attack; full insertion cooldowns are tested by verify_enemy_melee.
bandit.template.melee.attacks[0].ts=-10
duel.enemies.push(bandit)
duel.advance(1/30);const stopped={...path.position}
duel.advance(5/30);assert.equal(fighter.hp,40)
duel.advance(1/30);assert.equal(fighter.hp,38,'Bandit first strike at .2 seconds')
duel.advance(4/30);assert.equal(bandit.hp,40,'Arrival step yields before the knight begins its attack')
duel.advance(1/30);assert.equal(bandit.hp,37,'Knight strike follows its arrival yield and original 10/30-second windup')
duel.advance(2/30);assert.equal(fighter.hp,36,'Bandit second strike at 13/30 seconds')
close(path.position,stopped)
const goldBeforeKill=duel.gold;bandit.hp=1;duel.advance(2);assert.equal(bandit.hp,0);assert.equal(duel.gold,goldBeforeKill+templates.enemy_bandit.enemy.gold,'Queued knight damage awards the original kill bounty')
console.log('Original melee hit times: knight single strike and bandit double strike, with no travel while blocked')
const opening=new GameSession(read('level01'),read('level01-campaign'),templates,()=>.5)
applyStageSetup(opening,1,'campaign')
assert.equal(opening.gold,175)
assert.equal(opening.towers.sites.find(s=>s.id==='5').tower,'tower_knights_lvl1')
assert.equal(opening.towers.sites.find(s=>s.id==='5').spent,70)
assert.equal(opening.towers.sites.find(s=>s.id==='5').canBeModified,false)
opening.advance(3)
assert.equal(opening.barracks.soldiers.length,3)
for(const s of opening.barracks.soldiers)close(s.pos,rallyFormation(s.slot,3,{x:811,y:346},25))
console.log('First campaign opening: original free barracks, 175 gold and three rally positions verified')
