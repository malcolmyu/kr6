import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {EnemySkills} from '../src/game/EnemySkills.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {meleeSlot} from '../src/game/UnitPositions.ts'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),oracle=read('analysis/enemy-smoke-oracle.json'),levels=[read('public/data/level02.json'),read('public/data/level03.json')]
for(const row of oracle.casts){
 const e={id:100,name:'enemy_shadow_blades',born:0,age:0,hp:row.case.hp,template:structuredClone(templates.enemy_shadow_blades),path:{position:{x:600,y:350},remainingNodes:row.case.nodes}},skills=new EnemySkills(levels[0],templates,()=>.5),events=[]
 e.template.health.hp_max=70;skills.onSound=name=>events.push({name,at:clock});let clock=0,area=false
 for(let frame=0;frame<=60;frame++){
  clock=frame/30;const removed=skills.advance(clock,[e]);if(skills.areas.length&&!area){area=true;events.push({name:'aura_shadow_blades_smoke',at:clock})}
  if(removed.length){events.push({name:'remove',at:clock});break}
 }
 assert.equal(events.length,row.events.length,JSON.stringify(row.case))
 for(const [i,event]of events.entries()){assert.equal(event.name,row.events[i].name);assert(Math.abs(event.at-row.events[i].at)<1e-10)}
 assert.equal(e.hp,row.hp);assert.equal(!!e.template.health.ignore_damage,row.immune);assert.equal(e.template.vis.bans,row.visBans)
}
for(const row of oracle.areas){const geometry=new EnemySkills(levels[row.stage-2],templates,()=>.5).areaGeometry(row.from);assert.deepEqual(geometry.pos,row.pos);assert.deepEqual(geometry.decals,row.decals.map(d=>d.pos))}
for(const row of oracle.cycles){
 const skills=new EnemySkills(levels[0],templates,()=>.5),e={id:100,name:'enemy_bandit',born:0,age:0,hp:30,template:structuredClone(templates.enemy_bandit),path:{position:row.pos,remainingNodes:100}},applied=[]
 const born=Math.round(row.born*30)/30 // Restore the exact native tick after dkjson's decimal precision.
 skills.areas.push({id:1,born,pos:row.pos,duration:3,lastApply:born-.2,decals:[]})
 let last,endedAt
 for(let frame=Math.round(row.born*30);frame<=Math.round(row.endedAt*30);frame++){
  const time=frame/30;skills.advance(time,[e])
  if(e.smokeDodgeUntil!==last){applied.push(time);last=e.smokeDodgeUntil}
  if(skills.areas[0]?.endedAt!==undefined)endedAt=skills.areas[0].endedAt
 }
 assert.equal(applied.length,row.applied.length)
 for(const [i,time]of applied.entries())assert(Math.abs(time-row.applied[i])<1e-10,JSON.stringify({born:row.born,applied,expected:row.applied}))
 assert(Math.abs(endedAt-row.endedAt)<1e-10)
}
const game=new GameSession(levels[0],{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1}]},templates,()=>.5)
game.spawnCinematicEnemy('enemy_shadow_blades',1,{x:600,y:350});const caster=game.enemies[0];caster.template.health.hp_max=70;caster.hp=13
const first={...caster.path.position};game.advance(21/30)
assert.equal(caster.hp,70);assert.equal(caster.template.health.ignore_damage,true);assert.deepEqual(caster.path.position,first);assert.equal(game.enemySkills.areas.length,1)
game.advance(1);assert(!game.enemies.includes(caster));assert.equal(game.gold,0,'Smoke departure gives no kill reward');assert.equal(game.lives,20,'Smoke departure gives no goal damage')
game.advance(4);assert.equal(game.enemySkills.areas.length,0,'Smoke fades out and is removed after its aura ends')
// The original crow entry animation prevents movement, and then flight starts.
const crowGame=new GameSession(levels[1],{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1}]},templates,()=>.5)
crowGame.spawnCinematicEnemy('enemy_crow',1,{x:700,y:350});const crow=crowGame.enemies[0],start={...crow.path.position}
crowGame.advance(13/30);assert.deepEqual(crow.path.position,start);assert.equal(crow.visualOverride.name,'in');crowGame.advance(2/30);assert(Math.hypot(crow.path.position.x-start.x,crow.path.position.y-start.y)>0)
// Smoke grants the original unit dodge, rather than generic damage immunity:
// physical arrows miss, while wizard bolts do not call unit_dodges and still hit.
function rangedDamage(kind,immune=false,stunned=false){
 const template=structuredClone(templates.enemy_bandit);template.motion.max_speed=0;template.health.ignore_damage=immune;template.unit.is_stunned=stunned
 const e={id:99,name:'enemy_bandit',born:0,age:0,hp:100,template,path:new PathFollower([{x:550,y:350},{x:900,y:350}]),smokeDodgeUntil:10}
 const combat=new RangedCombat(templates,()=>.5,()=>{}),site={id:'test',pos:{x:450,y:350},tower:`tower_${kind}_lvl1`,terrain:1,holder:'tower_holder_terrain_1_1',rally:{x:500,y:350},spent:70}
 for(let frame=0;frame<=120;frame++)combat.advance(frame/30,[site],[e])
 return e.hp
}
assert.equal(rangedDamage('archers'),100,'Smoke dodges physical arrows')
assert(rangedDamage('archers',false,true)<100,'Stun disables the native smoke dodge check')
assert(rangedDamage('wizard')<100,'Wizard bolts bypass unit dodge, as in the native bolt updater')
assert.equal(rangedDamage('wizard',true),100,'The escaping smoke caster separately ignores damage')
const meleeEnemy={id:101,name:'enemy_bandit',born:0,age:0,hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:500,y:350},{x:900,y:350}]),smokeDodgeUntil:10}
for(const a of meleeEnemy.template.melee.attacks)a.damage_min=a.damage_max=0
const barracks=new BarracksCombat(templates,()=>.5,()=>{}),pawn=barracks.insertHero('soldier_knights_lvl1',meleeSlot(1,meleeEnemy.path.position,0,meleeEnemy.template.enemy.melee_slot,templates.soldier_knights_lvl1.soldier.melee_slot_offset),0,templates.soldier_knights_lvl1)
for(let frame=0;frame<=60;frame++)barracks.advance(frame/30,1/30,[],[meleeEnemy])
assert.equal(meleeEnemy.hp,1000,'Smoke also dodges the native melee check')
meleeEnemy.smokeDodgeUntil=undefined
for(let frame=61;frame<=120;frame++)barracks.advance(frame/30,1/30,[],[meleeEnemy])
assert(meleeEnemy.hp<1000,'Melee damage resumes when smoke protection ends')
console.log('Original shadow-blades HP/exit-node boundaries, smoke activation/removal times and seven cloud positions match; heal/immunity/no reward departure and crow entry movement gate verified')
