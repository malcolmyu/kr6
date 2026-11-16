import {RangedCombat} from '../src/game/RangedCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {equipRoyalReward,equippedPowers,progressStars} from '../src/game/NativeProgression.ts'
import {recordVictory} from '../src/game/ProgressStore.ts'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {RoyalEdictSystem} from '../src/game/RoyalEdictSystem.ts'
import {royalActorPose} from '../src/game/RoyalEdictPose.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {parseProgress} from '../src/game/ProgressStore.ts'
import {attackDamageValue} from '../src/game/BulletDamage.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),oracle=read('analysis/royal-edict-oracle.json')
const offsets=[[0,0],[200,0],[201,0],[0,140],[0,141],[100,100],[-250,-200],[0,0],[0,0]],sites=offsets.map(([x,y],i)=>({id:String(i),tower:'tower_archers_lvl1',pos:{x:500+x,y:350+y},towerBlocked:i===7,canBeMod:i!==8}))
for(const row of oracle.selection){const instance=new RoyalEdictSystem(structuredClone(sites),templates,()=>.5);instance.control.is_global=row.global;instance.cast({x:500,y:350},0);const actual=[...instance.buffs.values()].map(b=>[b.site.pos.x-500,b.site.pos.y-350]).sort(),expected=row.applied.map(v=>v.offset).sort();assert.deepEqual(actual,expected)}
const site={id:'1',tower:'tower_archers_lvl1',pos:{x:500,y:350}},royal=new RoyalEdictSystem([site],templates,()=>.5)
royal.cast(site.pos,0);assert.equal(site.damageFactor,oracle.lifecycle.initialFactor)
let count=0
for(const row of oracle.lifecycle.frames){const time=Math.round(row.at*30)/30;royal.advance(time);assert.equal(royal.buffs.has('1'),!row.removed);if(!row.removed){const buff=royal.buffs.get('1');assert.equal(time+1e-9<buff.loopAt?'start':'loop',row.animation);assert.equal(time+1e-9>=buff.expiresAt-1,row.tweenReverse)}else assert.equal(site.damageFactor,oracle.lifecycle.finalFactor);count++}
for(const decal of oracle.decals)for(const sample of decal.frames){const age=Math.round(sample.at*30)/30,pose=royalActorPose(age);assert.equal(pose.name,sample.animation);assert.equal(pose.done,sample.done);assert(Math.abs(pose.elapsed-(age-sample.ts))<1e-10)}
const upgraded=new RoyalEdictSystem([],templates,()=>.5);upgraded.configure(['power_royal_edict_l2a','power_royal_edict_l3','power_royal_edict_l4a','power_royal_edict_l5b','power_royal_edict_l6']);assert.equal(upgraded.control.range,300);assert.equal(upgraded.control.is_global,true);assert.equal(upgraded.modifier.range_factor,1.2);assert.equal(upgraded.modifier.damage_factor,1.95);assert.equal(upgraded.modifier.modifier.duration,7.98)
// Gameplay effects: equipped third slot, 50-second cooldown, preserved buff on upgrade and immediate cleanup on sell.
const game=new GameSession(read('public/data/level02.json'),{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]},templates,()=>.5)
game.configureStage(2,false);game.powers.equip(['reinforcements','rain_of_fire','royal_edict']);game.callNextWave()
const build=game.towers.sites.find(s=>!s.tower);game.build(build.id,'archers');game.advance(1)
assert(game.powers.select('royal_edict',game.time));assert(game.powers.cast(build.pos,game.time));assert.equal(game.powers.remaining('royal_edict',game.time),50);assert.equal(build.damageFactor,1.75)
game.upgradeTower(build.id);assert.equal(build.damageFactor,1.75);game.sellTower(build.id);assert.equal(build.damageFactor,1)
const profile=parseProgress('{"powers":["reinforcements","rain_of_fire","royal_edict"]}');assert.deepEqual(profile.powers,['reinforcements','rain_of_fire','royal_edict']);assert.equal(parseProgress('{"powers":["royal_edict","royal_edict"]}').powers,undefined)
assert.equal(attackDamageValue(2,4,1.75,()=>.1),4);assert.equal(attackDamageValue(0,0,1,()=>.5),0)
console.log(`Royal edict: native local/global tower selection, ${count} native modifier lifecycle frames, 422 original king/rug frames, upgrade patches, third-slot cooldown and upgrade/sell cleanup verified`)

for(const row of read('analysis/progression-auto-equip-oracle.json'))assert.deepEqual(equipRoyalReward(row.before),row.after)
const old={levels:{1:{campaign:3,iron:true}}};assert.equal(progressStars(old),4);assert.equal(equippedPowers(old).length,2)
const unlocked=recordVictory(old,2,'campaign',{kind:'victory',stars:3,lives:20});assert.deepEqual(unlocked.powers,['reinforcements','rain_of_fire','royal_edict']);assert.equal(progressStars(unlocked),7)
assert.deepEqual(equippedPowers({levels:unlocked.levels}),unlocked.powers,'Old saves derive the same unlocked third slot')
assert.deepEqual(equippedPowers({levels:{},powers:['royal_edict','rain_of_fire']}),['rain_of_fire'],'Locked powers cannot be equipped from an invalid profile')
assert.deepEqual(recordVictory({...unlocked,powers:['rain_of_fire']},2,'campaign',{kind:'victory',stars:3}).powers,['rain_of_fire'],'Replaying a claimed reward does not override a later equipment choice')
console.log('Five native reward auto-equip cases and the five-star unlock transition/old-save migration match')

// Gold upgrade only pays for a real death during the modifier lifetime.
for(const [deathAt,expected] of [[0,4],[29/30,4],[1,0]]) {
 const instance=new RoyalEdictSystem([],templates,()=>.5);instance.configure(['power_royal_edict_l4b']);instance.modifier.modifier.duration=1
 const enemy={id:1,hp:100,escapedAt:undefined,path:{position:{x:500,y:350}}},gold=[];instance.onGold=amount=>gold.push(amount)
 instance.cast({x:500,y:350},0);instance.advance(0,[enemy]);enemy.hp=0;instance.onEnemyKilled(enemy,deathAt);instance.onEnemyKilled(enemy,deathAt)
 assert.equal(gold.reduce((a,b)=>a+b,0),expected)
}
// The native respawn branch removes dead knights; normal barracks door logic replaces them.
const barracks=new GameSession(read('public/data/level02.json'),{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]},templates,()=>.5)
const holder=barracks.towers.sites.find(s=>!s.tower);barracks.build(holder.id,'knights');barracks.advance(3)
const dead=barracks.barracks.soldiers.find(s=>s.siteId===holder.id);dead.hp=0;dead.diedAt=barracks.time
barracks.powers.royal.configure(['power_royal_edict_l2b']);barracks.powers.royal.cast(holder.pos,barracks.time)
assert(!barracks.barracks.soldiers.includes(dead));barracks.advance(1)
assert.equal(barracks.barracks.soldiers.filter(s=>s.siteId===holder.id&&s.hp>0).length,3)

// The modifier reaches actual projectile damage, rather than only its visual state.
const firingSite={id:'1',tower:'tower_archers_lvl1',pos:{x:500,y:350}},buffed=new RoyalEdictSystem([firingSite],templates,()=>.5)
buffed.cast(firingSite.pos,0)
const enemy={id:1,name:'enemy_bandit',born:0,age:0,hp:100,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:600,y:400},{x:900,y:400}])};enemy.template.motion.max_speed=0
const combat=new RangedCombat(templates,()=>.5,()=>{})
for(let frame=0;frame<=40;frame++)combat.advance(frame/30,[firingSite],[enemy])
assert.equal(enemy.hp,91,'Original ceil(5*1.75) deals nine actual arrow damage')
