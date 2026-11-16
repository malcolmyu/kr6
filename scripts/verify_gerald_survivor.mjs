import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {damageSoldier} from '../src/game/SoldierHealth.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
import {EnemyTeleport} from '../src/game/EnemyTeleport.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),make=()=>{const barracks=new BarracksCombat(templates,()=>.5,()=>{}),heroes=new HeroSystem(templates,barracks);return {heroes,barracks,hero:heroes.insertGerald({x:500,y:350},0)}}
let frames=0
for(const row of read('analysis/gerald-survivor-oracle.json')){
 const {heroes,hero}=make(),system=heroes.survivor,events=[];system.configure(['skill_c',...(row.level>=2?['upg_sc1']:[]),...(row.level===3?['upg_sc2']:[])])
 system.onSound=name=>events.push({sound:name});system.onEffect=name=>events.push({name});system.onTeleport=()=>events.push({name:'mod_gerald_skill_c_teleport'})
 const enemy={hp:row.targetAlive?100:0}
 for(const sample of row.frames){const time=Math.round(sample.at*30)/30;if(time===.1){hero.hp=0;hero.diedAt=time;hero.deathTarget=enemy}system.advance(time,hero)
  assert.equal(hero.visualOverride?.name??'idle',sample.name);assert.equal(hero.hp,sample.hp);assert.equal(hero.xpQueued,sample.xp);assert.equal(hero.diedAt!==undefined,sample.dead);assert.equal(!!hero.ignoreDamage,sample.ignore);frames++
 }
 assert.deepEqual(events,row.events.map(e=>e.sound?{sound:e.sound}:{name:e.name}))
}
let teleportFrames=0
for(const row of read('analysis/enemy-teleport-oracle.json')){
 const level=read(`public/data/level0${row.stage}.json`),b=row.before,path=new EnemyPath(level.paths.paths,level.navigation,b.pi,b.spi);path.ni=b.ni;path.prevPis=[...b.prev];Object.assign(path.position,level.paths.paths[b.pi-1][b.spi-1][b.ni-1])
 const enemy={id:10,hp:100,path,template:structuredClone(templates.enemy_bandit)},system=new EnemyTeleport(templates.mod_gerald_skill_c_teleport),effects=[];system.onEffect=(name,pos,time)=>effects.push({name,pos,at:time})
 assert(system.apply(enemy,0))
 for(const sample of row.frames){const time=Math.round(sample.at*30)/30;system.advance(time)
  assert.equal(path.pi,sample.pi);assert.equal(path.ni,sample.ni);assert.deepEqual(path.position,sample.pos);assert.equal(enemy.teleportHidden?1:0,sample.hidden);assert.equal(!!enemy.template.unit.is_stunned,!!sample.stunned);assert.equal(enemy.template.health.ignore_damage,sample.ignore);assert.equal(enemy.teleportCount,sample.count);assert.equal(system.states.size===0,sample.done);assert.equal(enemy.template.vis.bans,sample.bans);teleportFrames++
 }
 assert.equal(effects.length,row.events.length);for(let i=0;i<effects.length;i++){assert.deepEqual(effects[i].pos,row.events[i].pos);assert.equal(effects[i].name,row.events[i].name);assert(Math.abs(effects[i].at-row.events[i].at)<1e-10)}
}
// Real damage dispatch keeps the combat target for the death-triggered rewind.
{
 const {heroes,hero,barracks}=make();heroes.survivor.configure(['skill_c']);hero.target={hp:100};const enemy=hero.target
 heroes.advance(0);damageSoldier(hero,{value:1000,damage_type:1},.1);assert.equal(hero.deathTarget,enemy)
 heroes.advance(.1);assert(hero.ignoreDamage);const hp=hero.hp;damageSoldier(hero,{value:500,damage_type:1},1);assert.equal(hero.hp,hp)
 heroes.advance(2.1);assert.equal(hero.hp,88);assert.equal(hero.diedAt,undefined);assert.equal(hero.respawnEndsAt,undefined);assert.equal(hero.ignoreDamage,false)
 heroes.advance(5);hero.target=enemy;damageSoldier(hero,{value:1000,damage_type:1},6);heroes.advance(6);assert(!heroes.survivor.active,'A second death inside cooldown follows regular respawn');assert.equal(hero.diedAt,6)
 heroes.advance(38);heroes.advance(40);assert.equal(hero.hp,220)
}
// A purchased native skill tree reaches an actual fixed-step battle and rewinds its blocked enemy.
{
 const level=read('public/data/level02.json'),game=new GameSession(level,{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]},templates,()=>.5)
 game.heroes.savedXp={hero_gerald:22000};game.heroes.savedUpgrades={hero_gerald:['skill_a','upg_a','upg_d','upg_b','skill_c']};applyStageSetup(game,2,'iron',true,true)
 const hero=game.heroes.gerald,path=new EnemyPath(level.paths.paths,level.navigation,3,1);path.ni=100;Object.assign(path.position,level.paths.paths[2][0][99]);const enemy={id:1000,name:'enemy_bandit',born:0,age:0,hp:100,template:structuredClone(templates.enemy_bandit),path};game.enemies.push(enemy);game.entities.queue(enemy.name,enemy,'enemy')
 game.advance(.1);hero.target=enemy;damageSoldier(hero,{value:1000,damage_type:1},game.time);game.advance(2.1);assert(hero.hp>0);assert(enemy.teleporting);assert.equal(enemy.teleportCount,1);const start=path.ni;game.advance(2.1);assert(path.ni<start);assert.equal(enemy.teleportHidden,false);assert(!enemy.template.health.ignore_damage)
}
console.log(`Gerald survivor: ${frames} native death/revive animation/health/XP frames, ${teleportFrames} native enemy teleport frames across three maps and path history, actual damage/respawn cooldown and legal-tree battle integration verified`)

for(const row of read('analysis/enemy-teleport-selection-oracle.json')){
 const level=read('public/data/level01.json'),path=new EnemyPath(level.paths.paths,level.navigation,1,1),enemy={id:1,hp:row.dead?0:100,path,teleportCount:row.count,template:structuredClone(templates[row.name])};enemy.template.vis={flags:row.flags,bans:row.bans}
 const system=new EnemyTeleport(templates.mod_gerald_skill_c_teleport);assert.equal(system.apply(enemy,0),row.inserted)
}
console.log('Seven native teleport eligibility cases match, including fifth-use cap, flying enemies, bosses and modifier immunity')

// Original enemy mixed-walk helper keeps the arrived dead hero as its blocker until recovery.
{
 const native=read('analysis/gerald-dead-blocker-oracle.json');assert.equal(native.result,true);assert.equal(native.blockers,1);assert.equal(native.target,true)
 const {heroes,hero,barracks}=make();heroes.survivor.configure(['skill_c']);heroes.advance(0)
 const level=read('public/data/level01.json'),path=new EnemyPath(level.paths.paths,level.navigation,1,1),enemy={id:100,name:'enemy_bandit',born:0,age:0,hp:100,template:structuredClone(templates.enemy_bandit),path};hero.target=enemy;damageSoldier(hero,{value:1000,damage_type:1},.1);heroes.advance(.1);barracks.advance(.1,1/30,[],[enemy]);assert(enemy.blocked);assert.equal(enemy.meleeAttack,undefined);assert.equal(enemy.idleStartedAt,.1);assert.equal(hero.target,enemy)
}

{
 const {heroes,hero}=make();heroes.survivor.configure(['skill_c']);heroes.advance(0);hero.hp=0;hero.diedAt=.1;heroes.advance(.1);assert.equal(heroes.moveGerald({x:450,y:350}),false)
 heroes.advance(2.1);assert.equal(heroes.moveGerald({x:450,y:350}),true);heroes.advance(2.2);assert.equal(heroes.survivor.active,false);assert.equal(hero.hp,88);assert.equal(hero.scriptLocked,false)
}
