import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {GameSession} from '../src/game/GameSession.ts'
const read=path=>JSON.parse(readFileSync(path)),templates=read('public/data/entities.json')
const combat=new RangedCombat(templates,()=>.5,()=>{}),site={id:'source',pos:{x:500,y:350},tower:'tower_catapult_lvl1',damageFactor:1.75},pos={x:620,y:470}
const enemy={id:1,name:'enemy_bandit',hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([pos,{x:1200,y:470}])};enemy.template.motion.max_speed=0
const queued=[],nativeShoot=combat.catapultTowers.onShoot;combat.catapultTowers.onShoot=(...args)=>{queued.push(args);nativeShoot(...args)}
let frame=1
for(;frame<200&&!queued.length;frame++)combat.advance(frame*(1/30),[site],[enemy])
assert.equal(queued.length,1);assert.equal(combat.projectiles.length,0,'native ground projectile is queued until the next insertion phase')
const firedAt=queued[0][5];combat.advance(frame*(1/30),[],[enemy])
assert.equal(combat.catapultTowers.states.size,0,'selling the tower cancels its script')
assert.equal(combat.projectiles.length,1,'already queued projectile survives source sale')
const shot=combat.projectiles[0];assert.equal(shot.born,frame*(1/30));assert(Math.abs(shot.born-firedAt-1/30)<1e-12);assert.equal(shot.target,undefined,'ground bomb has no enemy target binding');assert.equal(shot.damageFactor,1.75);assert.deepEqual(shot.to,pos)
for(frame++;frame<250&&combat.projectiles.length;frame++)combat.advance(frame*(1/30),[],[enemy])
assert(enemy.hp<1000,'unbound bomb still applies captured damage after source sale')
const data=read('public/data/level03.json'),g=new GameSession(data,read('public/data/level03-iron.json'),templates,()=>.5,'iron')
g.spawnCinematicEnemy('enemy_bandit',1,{x:0,y:0});const e=g.enemies.at(-1);e.path.position.x+=2.25;e.path.position.y-=1.75
const expected=e.path.nativePrediction(0,0);assert.deepEqual(g.combat.predictTarget(e,0).pos,expected.pos);assert.notDeepEqual(expected.pos,e.path.position,'native zero-time prediction uses the current node, not interpolated position')
console.log('Catapult integration: next-tick insertion, source-sale survival, no bound enemy, captured Royal factor, real AoE impact and native GameSession node prediction verified')
