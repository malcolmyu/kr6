import assert from 'node:assert/strict'
import {SaveSlots,slotKey,slotBackupKey,ACTIVE_SLOT_KEY,SLOT_MIGRATION_KEY} from '../src/game/SaveSlots.ts'
const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}
const first=new SaveSlots(storage);first.select(1)
const other=new SaveSlots(storage),stale=other.loadActive()
first.saveActive({levels:{1:{campaign:3}},onboarding:{stage1:true},heroes:{hero_gerald:72000},heroUpgrades:{hero_gerald:['skill_a']}})
const merged=other.saveActive({...stale,heroes:{hero_gerald:12}})
assert.equal(merged.levels[1].campaign,3);assert.equal(merged.heroes.hero_gerald,72000);assert(merged.onboarding.stage1);assert.deepEqual(merged.heroUpgrades.hero_gerald,['skill_a'])
data.set(slotKey(1),'{broken');assert.equal(new SaveSlots(storage).loadActive().levels[1].campaign,3)
data.delete(slotKey(1));assert.equal(new SaveSlots(storage).loadActive().heroes.hero_gerald,72000)
other.delete(1);assert.equal(data.get(slotBackupKey(1)),undefined);assert.equal(other.read(1),undefined)
other.select(2);other.saveActive({levels:{2:{campaign:2}}});assert.equal(other.read(1),undefined);assert.equal(other.read(2).levels[2].campaign,2)
const recovered=new Map([[SLOT_MIGRATION_KEY,'1'],[ACTIVE_SLOT_KEY,'2'],['kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3}}})]])
const legacyStore={getItem:k=>recovered.get(k)??null,setItem:(k,v)=>recovered.set(k,v),removeItem:k=>recovered.delete(k)};assert.equal(new SaveSlots(legacyStore).loadActive().levels[1].campaign,3)
console.log('Stale-tab saves preserve earned progress and settings; corrupt/missing primary recovers backup; deletion clears backup and slots remain isolated.')
