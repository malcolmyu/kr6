import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {EnemyArrowMotion} from '../src/game/EnemyArrowMotion.ts'
import {canEnemyRange,EnemyRangedCombat} from '../src/game/EnemyRangedCombat.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),oracle=read('analysis/enemy-archer-oracle.json')
let frames=0
for(const trace of oracle.bolts){
 const motion=new EnemyArrowMotion({x:0,y:0},trace.to,templates.bullet_shadow_archer.bullet)
 assert(Math.abs(motion.duration-trace.duration)<1e-12)
 for(const [frame,expected]of trace.frames.entries()){
  const done=motion.step(frame/30,1/30,trace.to)
  assert.equal(done,expected.done,`arrow arrival ${frame}`);assert.equal(motion.hidden,expected.hidden)
  assert(Math.hypot(motion.pos.x-expected.pos.x,motion.pos.y-expected.pos.y)<1e-8,`arrow position ${frame}`)
  assert(Math.abs(motion.rotation-expected.r)<1e-8,`arrow rotation ${frame}`);frames++
 }
}
const enemy={id:100,name:'enemy_shadow_archer',born:0,age:0,hp:100,template:structuredClone(templates.enemy_shadow_archer),path:new PathFollower([{x:500,y:350},{x:1000,y:350}])}
for(const row of oracle.targeting){const s={hp:40,pos:{x:500+row.pos.x,y:350+row.pos.y},template:templates.soldier_knights_lvl1};assert.equal(canEnemyRange(enemy,s,enemy.template.ranged.attacks[0]),row.canRange,JSON.stringify(row))}
const castEnemy={...enemy,template:structuredClone(enemy.template),path:new PathFollower([{x:500,y:350},{x:1000,y:350}])},castSoldier={id:99,hp:1000,pos:{x:600,y:350},template:templates.soldier_knights_lvl1},ranged=new EnemyRangedCombat(read('public/data/level02.json'),templates,()=>.5),casts=[]
let clock=0;ranged.onSound=name=>{if(name==='ArrowSound')casts.push({at:clock,from:{...ranged.projectiles.at(-1).pos},to:ranged.projectiles.at(-1).to})}
for(let frame=0;frame<=210;frame++){clock=frame/30;ranged.advance(clock,1/30,[castEnemy],[castSoldier])}
assert.equal(casts.length,oracle.casts.length)
for(const [i,cast]of casts.entries()){const expected=oracle.casts[i];assert(Math.abs(cast.at-expected.at)<1e-10,JSON.stringify({cast,expected}));assert.deepEqual(cast.from,expected.from);assert.deepEqual(cast.to,expected.to)}
const game=new GameSession(read('public/data/level02.json'),{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1}]},templates,()=>.5)
game.enemies.push(enemy)
const soldier=game.barracks.insertHero('soldier_knights_lvl1',{x:600,y:350},0,templates.soldier_knights_lvl1);soldier.hero=false;soldier.hp=20;soldier.scriptLocked=true
const sounds=[],effects=[];game.onSound=s=>sounds.push(s);game.enemyRanged.onEffect=n=>effects.push(n)
game.advance(1.8);assert.equal(enemy.path.position.x,500,'hold_advance stops the archer before its first cooldown');assert.equal(game.enemyRanged.projectiles.length,0)
game.advance(.1);assert.equal(game.enemyRanged.projectiles.length,1);assert(sounds.includes('ArrowSound'))
game.advance(4);assert(soldier.hp<=0);assert(soldier.diedAt!==undefined);assert(effects.includes('fx_blood_splat'));assert(sounds.includes('HitSound'));assert.equal(game.gold,0,'Shooting allied units must not grant enemy-kill gold')
assert(enemy.path.position.x>500,'Archer resumes walking once no ranged target remains')
console.log(`${frames} original shadow-archer arrow frames match position/rotation/hide/arrival; native range ellipse boundaries, hold/cooldown/windup, arrow damage/death/blood/sounds and resumed movement verified`)
