import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PowerProgression,powerKinds,powerXpFraction} from '../src/game/PowerProgression.ts'
import {parseProgress,recordPowerXp} from '../src/game/ProgressStore.ts'
import {SaveSlots} from '../src/game/SaveSlots.ts'
import {GameSession} from '../src/game/GameSession.ts'
const read=path=>JSON.parse(readFileSync(path)),rows=read('analysis/power-progression-oracle.json')
let progression,lastKey,count=0
for(const row of rows){
 const key=JSON.stringify([row.xp,row.playerLevel,row.mode])
 if(key!==lastKey){progression=new PowerProgression();progression.configure(Object.fromEntries(powerKinds.map(kind=>[kind,row.xp])),row.playerLevel,row.mode);lastKey=key}
 if(row.use)for(const kind of powerKinds)progression.use(kind)
 for(const kind of powerKinds){const expected=row.status[kind],state=progression.status[kind];assert.equal(state.base,expected.base);assert(Math.abs(state.gain-expected.gain)<1e-8);assert.equal(state.level,expected.level);assert(Math.abs(powerXpFraction(progression.xp(kind))-expected.fraction)<1e-12);assert.equal(state.level,expected.display);count++}
}
const p=new PowerProgression();p.configure({reinforcements:5900},1,3);p.use('reinforcements');assert.equal(p.status.reinforcements.level,2);p.use('reinforcements');assert.equal(p.xp('reinforcements'),6200,'same-entry expected-level multiplier after leveling')
const stored=recordPowerXp({levels:{},powerXp:{rain_of_fire:1000}},p.snapshot());assert.equal(stored.powerXp.rain_of_fire,1000,'older snapshot cannot reduce progress');assert.equal(stored.powerXp.reinforcements,6200)
assert.deepEqual(parseProgress(JSON.stringify(stored)),stored)
assert.deepEqual(parseProgress('{"powerXp":{"reinforcements":-1,"rain_of_fire":"3","royal_edict":42.9,"unknown":500}}').powerXp,{royal_edict:42})
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},slots=new SaveSlots(storage)
slots.select(1);slots.saveActive(stored);assert.deepEqual(new SaveSlots(storage).loadActive(),stored);assert.equal(slots.select(2).progress.powerXp,undefined,'new slot is isolated');slots.select(1);assert.equal(slots.loadActive().powerXp.reinforcements,6200);slots.delete(1);assert.equal(slots.select(1).progress.powerXp,undefined)
const g=new GameSession(read('public/data/level02.json'),read('public/data/level02-iron.json'),read('public/data/entities.json'),()=>.5,'iron');g.powers.equip(powerKinds);g.powers.progression.configure({},3,3);g.callNextWave()
g.advance(1/30)
assert(g.powers.select('reinforcements',g.time));assert.equal(g.powers.cast({x:-10000,y:-10000},g.time),false);assert.equal(g.powers.progression.xp('reinforcements'),0,'invalid placement earns nothing')
assert(g.powers.cast({x:550,y:315},g.time));assert.equal(g.powers.progression.xp('reinforcements'),0,'queued control is not inserted yet');g.powers.advance(g.time+1/30,1/30,[]);assert.equal(g.powers.progression.xp('reinforcements'),150);assert.equal(g.powers.cast({x:550,y:315},g.time),false);assert.equal(g.powers.progression.xp('reinforcements'),150,'repeat/cooldown earns nothing')
assert(g.powers.select('rain_of_fire',g.time));assert(g.powers.cast({x:550,y:315},g.time));g.powers.advance(g.time+2/30,1/30,[]);assert.equal(g.powers.progression.xp('rain_of_fire'),600,'one control use, not each meteor')
assert(g.powers.select('royal_edict',g.time));assert(g.powers.cast({x:550,y:315},g.time));g.powers.advance(g.time+3/30,1/30,[]);assert.equal(g.powers.progression.xp('royal_edict'),480,'one use, independent of affected tower count')
console.log(`${count} native power XP/level/GUI comparisons; entry-fixed catch-up multipliers, modes, max level, save migration/isolation and actual accepted/rejected spell casts verified`)
