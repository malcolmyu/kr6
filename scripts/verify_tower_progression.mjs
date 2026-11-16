import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {equippedTowers,unlockedTowers,equipTowerReward,parseTowerLoadout} from '../src/game/TowerProgression.ts'
import {recordVictory,parseProgress} from '../src/game/ProgressStore.ts'
import {GameSession} from '../src/game/GameSession.ts'
const rows=JSON.parse(readFileSync('analysis/tower-auto-equip-oracle.json'))
for(const row of rows)assert.deepEqual(equipTowerReward(row.before,row.name.slice(6)),row.after)
let p={levels:{}}
assert.deepEqual(equippedTowers(p),['archers','knights','catapult'])
const win=(stars)=>({kind:'victory',stars,lives:20})
p=recordVictory(p,1,'campaign',win(3));assert.deepEqual(p.towers,['archers','knights','catapult','wizard'])
p=recordVictory(p,1,'iron',win(1));assert.equal(p.towers.length,4)
p=recordVictory(p,2,'campaign',win(3));assert.deepEqual(p.towers,['archers','knights','catapult','wizard','culverine'])
assert.deepEqual(unlockedTowers(p),p.towers);assert.deepEqual(parseProgress(JSON.stringify(p)),p)
const again=recordVictory(p,2,'campaign',win(3));assert.deepEqual(again,p)
assert.deepEqual(equippedTowers({levels:{1:{campaign:3},2:{campaign:3,iron:true}}}),p.towers,'old profiles infer already granted auto-equips')
assert.deepEqual(equippedTowers({levels:{},towers:['wizard','archers','culverine']}),['archers'],'unearned saved choices cannot unlock towers')
assert.deepEqual(equippedTowers({levels:{},towers:[]}),[],'explicit empty selection stays empty')
assert.deepEqual(recordVictory({levels:{1:{campaign:2}},towers:['catapult','archers']},1,'campaign',win(3)).towers,['catapult','archers','wizard'])
for(const input of [null,{},['wizard','wizard'],['unknown'],Array(6).fill('archers')])assert.equal(parseTowerLoadout(input),undefined)
assert.deepEqual(parseProgress(JSON.stringify({levels:{},towers:['unknown']})),{levels:{}})
assert.deepEqual(parseProgress(JSON.stringify({levels:{},towers:[]})).towers,[])
assert.deepEqual(recordVictory(p,3,'campaign',{kind:'defeat',stars:0,lives:0}),p)
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
const fresh=new GameSession(read('public/data/level02.json'),read('public/data/level02-campaign.json'),templates)
assert.deepEqual(fresh.towers.available,['tower_build_archers','tower_build_knights','tower_build_catapult'])
assert.throws(()=>fresh.build(fresh.towers.sites.find(s=>!s.tower).id,'wizard'),/无法建造/)
const earned=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),templates,()=>.5,'campaign',equippedTowers(p))
assert.deepEqual(earned.towers.available,p.towers.map(t=>`tower_build_${t}`))
earned.gold=1000;const slot=earned.towers.sites.find(s=>!s.tower);earned.build(slot.id,'culverine');earned.advance(1);assert.equal(slot.tower,'tower_culverine_lvl1')
for(const [stage,expected]of [[1,['archers','catapult']],[2,['knights','wizard']],[3,['wizard','catapult']]]){
 const game=new GameSession(read(`public/data/level0${stage}.json`),read(`public/data/level0${stage}-iron.json`),templates,()=>.5,'iron',['culverine'])
 assert.deepEqual(game.towers.available,expected.map(t=>`tower_build_${t}`))
 game.towers.setLoadout([]);assert.deepEqual(game.towers.available,expected.map(t=>`tower_build_${t}`),'forced mode replaces even empty equipment')
}
console.log(`${rows.length} original tower reward auto-equip cases match slot limit, duplicate guards and ordering; initial three towers, 3/7-star unlocks, earned progression, save validation and old-profile migration verified`)
