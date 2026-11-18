import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {equipHero,equippedHeroes,heroStartingXp,heroUnlocked,parseHeroTeam} from '../src/game/HeroTeam.ts'
import {parseProgress,recordVictory} from '../src/game/ProgressStore.ts'
const oracle=JSON.parse(readFileSync('analysis/hero-team-equip-oracle.json'));assert(oracle.length>0)
const levels={1:{campaign:3,iron:true},2:{campaign:3,iron:true},3:{campaign:3,iron:true}}
for(const row of oracle){const p={levels,heroTeam:row.team,heroes:{[row.name]:row.xp}},next=equipHero(p,row.name,row.index);assert.deepEqual(next.heroTeam,row.result.team);assert.equal(next.heroes[row.name],row.result.status[row.name].xp)}
assert.equal(heroStartingXp('hero_bolin'),1000);assert.equal(heroStartingXp('hero_gerald'),0)
assert.deepEqual(equippedHeroes({levels:{}}),['hero_gerald']);assert(!heroUnlocked({levels:{1:{campaign:3},2:{campaign:3},3:{campaign:3,iron:true}}},'hero_bolin'));assert(heroUnlocked({levels:{1:{campaign:3,iron:true},2:{campaign:3},3:{campaign:3,iron:true}}},'hero_bolin'))
const win=recordVictory({levels:{}},1,'campaign',{kind:'victory',stars:3});assert.deepEqual(equippedHeroes(win),['hero_gerald','hero_zefira'])
for(const bad of [['hero_bolin','hero_bolin'],['hero_unknown'],['hero_gerald','hero_zefira','hero_bolin'],{}])assert.equal(parseHeroTeam(bad),undefined)
const save=parseProgress(JSON.stringify({levels,heroTeam:['hero_bolin','hero_zefira'],heroes:{hero_bolin:0},heroUpgrades:{hero_bolin:['skill_a','invented']}}));assert.deepEqual(save.heroTeam,['hero_bolin','hero_zefira']);assert.deepEqual(save.heroUpgrades.hero_bolin,['skill_a']);assert.equal(save.heroes.hero_bolin,0)
console.log(`${oracle.length} original native hero equipment calls, starting XP, 11-star unlock, default/auto-equip, malformed-save rejection and Bolin skill persistence verified`)
