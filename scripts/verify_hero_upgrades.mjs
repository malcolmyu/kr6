import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {evaluateHeroGraph,remainingHeroPoints,validateHeroUpgrades,purchaseHeroUpgrade} from '../src/game/HeroUpgrades.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/hero-upgrades.json'),oracle=read('analysis/hero-graph-oracle.json')
for(const row of oracle){
 const actual=evaluateHeroGraph(data.graphs[row.hero],row.selected,row.points)
 for(const key of ['enable_buttons','unavailable_buttons','block_buttons','active_links'])assert.deepEqual(actual[key],Object.fromEntries(Object.entries(row.result[key])),`${row.hero} ${row.selected} ${row.points} ${key}`)
 assert.deepEqual(actual.available_nodes,[...row.result.available_nodes])
}
assert.deepEqual(validateHeroUpgrades(data,'hero_gerald',0,['skill_a','skill_b']),[])
assert.deepEqual(validateHeroUpgrades(data,'hero_gerald',1000,['skill_b','skill_a','skill_a','upg_sa2']),['skill_b','skill_a'])
assert.deepEqual(validateHeroUpgrades(data,'hero_gerald',4000,['upg_sa2','upg_sa1','skill_a']),['skill_a','upg_sa1','upg_sa2'])
assert.equal(remainingHeroPoints(data,'hero_gerald',1000,['skill_a','skill_b']),1)
assert.deepEqual(purchaseHeroUpgrade(data,'hero_gerald',1000,['skill_a','skill_b'],'upg_a'),['skill_a','skill_b','upg_a'])
assert.deepEqual(purchaseHeroUpgrade(data,'hero_gerald',1000,['skill_a','skill_b'],'upg_sa1'),['skill_a','skill_b'])
console.log(`${oracle.length} original hero graph evaluations match: forward prerequisites, point costs, exclusive talent branches; level points, purchase and save validation verified`)

const {HeroSystem}=await import('../src/game/HeroSystem.ts'),{BarracksCombat}=await import('../src/game/BarracksCombat.ts'),{parseProgress}=await import('../src/game/ProgressStore.ts')
const templates=read('public/data/entities.json')
for(const row of read('analysis/hero-passives-oracle.json')){
 const barracks=new BarracksCombat(templates,()=>.5,()=>{}),heroes=new HeroSystem(templates,barracks)
 // Start at max XP so every prerequisite is affordable; set the desired native stat level afterwards.
 heroes.savedXp[row.name]=72000;heroes.savedUpgrades[row.name]=row.nodes
 const hero=heroes.insert(row.name,{x:500,y:350},0),ls=hero.template.hero.level_stats,index=row.level-1
 assert(Math.abs(ls.hp_max[index]-row.hp)<1e-9);assert(Math.abs(ls.armor[index]-row.armor)<1e-9);assert(Math.abs(ls.regen_health[index]-row.regen)<1e-9);assert.equal(hero.template.health.dead_lifetime,row.respawn)
 assert(Math.abs(ls.melee_damage_min[index]-row.attacks[0].min)<1e-9);assert(Math.abs(ls.melee_damage_max[index]-row.attacks[0].max)<1e-9)
 assert.equal(hero.template.melee.attacks[0].xp_gain_factor,row.attacks[0].xp)
}
const profile=parseProgress(JSON.stringify({heroes:{hero_gerald:1000},heroUpgrades:{hero_gerald:['skill_a','skill_b','upg_sa2','invented']}}))
assert.deepEqual(profile.heroUpgrades.hero_gerald,['skill_a','skill_b'])
const heroes=new HeroSystem(templates,new BarracksCombat(templates,()=>.5,()=>{}));heroes.savedXp=profile.heroes;heroes.savedUpgrades=profile.heroUpgrades;heroes.insertGerald({x:500,y:350},0)
assert.equal(heroes.geraldSkills.levels.skill_a,1);assert.equal(heroes.geraldSkills.levels.skill_b,1)
console.log('20 native passive stat levels and saved legal hero skills reach the actual hero templates; invalid or over-budget save nodes are rejected')
