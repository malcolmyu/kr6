import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {evaluateHeroGraph} from '../src/game/HeroUpgrades.ts'
import {powerUpgradeData,powerUpgradeTemplates,remainingPowerPoints,purchasePowerUpgrade,validatePowerUpgrades} from '../src/game/PowerUpgrades.ts'
const read=path=>JSON.parse(readFileSync(path)),data=read('public/data/power-upgrades.json'),patches=read('analysis/power-upgrade-patch-oracle.json'),graphs=read('analysis/power-upgrade-graph-oracle.json')
function compare(a,b,path=''){
 if(typeof a==='number'&&typeof b==='number'){assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(b)),`${path}: ${a} != ${b}`);return}
 if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort(),path);for(const key of Object.keys(b))compare(a[key],b[key],`${path}.${key}`);return}
 assert.deepEqual(a,b,path)
}
for(const row of patches){const before=JSON.stringify(data.templates),actual=powerUpgradeTemplates(data.templates,{[row.kind]:row.selected});compare(actual,row.templates,`${row.kind}/${row.selected}`);assert.equal(JSON.stringify(data.templates),before,'base templates are immutable')}
for(const row of graphs){const actual=evaluateHeroGraph(powerUpgradeData.graphs[row.source],row.selected,row.points);for(const key of ['enable_buttons','unavailable_buttons','block_buttons','active_links'])assert.deepEqual(actual[key],Object.fromEntries(Object.entries(row.result[key])),`${row.source}/${row.selected}/${row.points}/${key}`);assert.deepEqual(actual.available_nodes,[...row.result.available_nodes])}
for(const kind of ['reinforcements','rain_of_fire','royal_edict']){
 assert.equal(remainingPowerPoints(kind,0,[]),0);assert.equal(remainingPowerPoints(kind,90000,[]),5)
 assert.deepEqual(purchasePowerUpgrade(kind,0,[],'l2a'),[])
 assert.deepEqual(validatePowerUpgrades(kind,6000,['l2a','l2b','l3','invented','origin']),['l2a'])
 assert.deepEqual(validatePowerUpgrades(kind,90000,['l6','l5a','l4a','l3','l2a','l2a']),['l2a','l3','l4a','l5a','l6'])
 assert.deepEqual(validatePowerUpgrades(kind,90000,['l2b','l3','l4b','l5b','l6','l5a']),['l2b','l3','l4b','l5b','l6'])
}
console.log(`${patches.length} native power patch sets and ${graphs.length} skill graph states match; point budgets, prerequisites, exclusive branches and immutable base templates verified`)

const {GameSession}=await import('../src/game/GameSession.ts'),{parseProgress}=await import('../src/game/ProgressStore.ts'),{soldierHealth,damageSoldier}=await import('../src/game/SoldierHealth.ts')
const templates=read('public/data/entities.json'),level=read('public/data/level01.json'),program=read('public/data/level01-campaign.json'),node=level.paths.paths[0][0][100]
const saved=parseProgress(JSON.stringify({powerXp:{reinforcements:6000,rain_of_fire:6000,royal_edict:6000},powerUpgrades:{reinforcements:['l2a','l2b','l3'],rain_of_fire:['l2b'],royal_edict:['l2a']}}))
assert.deepEqual(saved.powerUpgrades,{reinforcements:['l2a'],rain_of_fire:['l2b'],royal_edict:['l2a']})
const fresh=()=>new GameSession(level,program,templates,()=>.5),create=selection=>new GameSession(level,program,templates,()=>.5,'campaign',undefined,selection)
const upgraded=create(saved.powerUpgrades);upgraded.callNextWave();upgraded.advance(1/30)
assert(upgraded.powers.select('reinforcements',upgraded.time));assert(upgraded.powers.cast(node,upgraded.time))
assert.equal(upgraded.barracks.soldiers[0].template.unit.damage_factor,1.5);assert.equal(upgraded.barracks.soldiers[0].expiresAt,upgraded.time+12)
assert.equal(upgraded.powers.royal.modifier.range_factor,1.2)
const durable=create({reinforcements:['l2b']});durable.barracks.reinforce(node,0);assert.equal(durable.barracks.soldiers[0].expiresAt,17)
const faster=create({rain_of_fire:['l2a']});faster.callNextWave();faster.advance(1/30);assert(faster.powers.select('rain_of_fire',faster.time));assert(faster.powers.cast(node,faster.time));assert.equal(faster.powers.remaining('rain_of_fire',faster.time),55)
function enemy(pos,hp=500){return {id:700,name:'enemy_bandit',hp,template:structuredClone(templates.enemy_bandit),path:{position:{...pos},direction:{x:1,y:0},finished:false,remainingNodes:1}}}
function meteorDamage(game){const e=enemy(node);game.powers.meteors.push({id:1,born:0,pos:{...node},to:{...node},speed:300,maxHeight:768,shadowScale:1,rotation:0});game.powers.advance(0,1/30,[e]);return 500-e.hp}
assert.equal(meteorDamage(upgraded),50);assert.equal(meteorDamage(fresh()),45)
const strong=upgraded.barracks.soldiers[0],target=enemy(strong.pos);strong.deploying=false;strong.target=target;strong.attack={startedAt:0,nextHit:0,attack:strong.template.melee.attacks[0],targetId:target.id}
upgraded.barracks.soldierAttack(strong,target,1);assert.equal(500-target.hp,5,'reinforcement damage factor reaches actual melee damage')
const spiked=create({reinforcements:['l2b','l3','l4b','l5b']});spiked.barracks.reinforce(node,0);const soldier=spiked.barracks.soldiers[0],foe=enemy(node);soldier.target=foe
assert.equal(soldierHealth(soldier).spiked_armor,.2);damageSoldier(soldier,{value:10,damage_type:2},0);assert.equal(foe.hp,498,'native template spikes reflect damage')
const plain=fresh();plain.barracks.reinforce(node,0);assert.equal(plain.barracks.soldiers[0].template.unit.damage_factor,1);assert.equal(plain.barracks.soldiers[0].template.health.armor,0);assert.equal(plain.powers.royal.modifier.range_factor,1);assert.equal(templates.soldier_reinforcement_base.unit.damage_factor,1)
assert.deepEqual(parseProgress(JSON.stringify({powerUpgrades:{reinforcements:['l2a']}})).powerUpgrades,{reinforcements:[]})
console.log('Saved legal power purchases reach session-local cooldown, meteor/melee damage, reinforcement duration, Royal range and spike reflection; fresh sessions retain native base values')
