import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SaveSlots,slotKey} from '../src/game/SaveSlots.ts'
import {parseProgress,hasSeenIntroduction,recordIntroduction,recordHeroXp,recordVictory,playerLevel,PROGRESS_KEY} from '../src/game/ProgressStore.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
let slots=new SaveSlots(storage),fresh=slots.select(1).progress
assert.deepEqual(fresh,{levels:{},onboarding:{}});assert.equal(hasSeenIntroduction(fresh,'stage1'),false)
const started=recordIntroduction(fresh,'stage1');slots.saveActive({...recordHeroXp(started,[{name:'hero_gerald',xp:37}]),lastPlayed:{stage:1,mode:'campaign'}})
slots=new SaveSlots(storage);const saved=slots.loadActive();assert(hasSeenIntroduction(saved,'stage1'));assert.equal(hasSeenIntroduction(saved,'stage2'),false);assert.equal(hasSeenIntroduction(saved,'comic2'),false);assert.deepEqual(saved.levels,{});assert.equal(playerLevel(saved),1);assert.equal(saved.heroes.hero_gerald,37);assert.deepEqual(saved.lastPlayed,{stage:1,mode:'campaign'})
assert.equal(slots.select(1).next,'map');assert.deepEqual(slots.select(2).progress,{levels:{},onboarding:{}});assert(!hasSeenIntroduction(slots.read(2),'stage1'));assert(hasSeenIntroduction(slots.read(1),'stage1'))
slots.delete(1);assert(!hasSeenIntroduction(slots.select(1).progress,'stage1'),'deleting a slot starts onboarding fresh')
values.set(slotKey(3),JSON.stringify({version:1,progress:{levels:{}}}));const old=slots.select(3).progress;assert(hasSeenIntroduction(old,'stage1'),'existing zero-star saves from the old version do not repeat guides');assert.deepEqual(old.levels,{})
values.clear();values.set(PROGRESS_KEY,JSON.stringify({levels:{1:{campaign:2},2:{campaign:1}}}));slots=new SaveSlots(storage);const legacy=slots.select(1).progress;assert(hasSeenIntroduction(legacy,'stage1'));assert(hasSeenIntroduction(legacy,'stage2'));assert(hasSeenIntroduction(legacy,'comic2'));assert.deepEqual(legacy.levels,{1:{campaign:2},2:{campaign:1}})
assert.deepEqual(parseProgress(JSON.stringify({onboarding:{stage1:true,stage2:false,comic2:'true',unknown:true},lastPlayed:{stage:2,mode:'iron'},levels:{}})),{levels:{},onboarding:{stage1:true},lastPlayed:{stage:2,mode:'iron'}})
for(const lastPlayed of [{stage:0,mode:'campaign'},{stage:4,mode:'iron'},{stage:1.5,mode:'campaign'},{stage:1,mode:'unknown'}])assert.equal(parseProgress(JSON.stringify({lastPlayed})).lastPlayed,undefined)
for(const onboarding of [true,[],1,'yes'])assert.equal(parseProgress(JSON.stringify({onboarding})).onboarding,undefined)
const firstWin=recordVictory(started,1,'campaign',{kind:'victory',stars:3,lives:20});assert(!hasSeenIntroduction(firstWin,'comic2'),'first victory still offers comic2');assert(hasSeenIntroduction(recordIntroduction(firstWin,'comic2'),'comic2'))
const read=p=>JSON.parse(readFileSync(`public/data/${p}.json`)),templates=read('entities')
for(const [progress,expected]of [[fresh,true],[saved,false],[old,false]]){
 const game=new GameSession(read('level01'),read('level01-campaign'),templates,()=>.5)
 applyStageSetup(game,1,'campaign',false,false,false,progress.onboarding)
 assert.equal(!!game.tutorial,expected);assert(!game.heroes.zefira,'seeing a guide must not unlock a second hero');assert.equal(game.gold,expected?175:245);assert.equal(game.towers.sites.find(s=>s.id==='5').tower,expected?'tower_knights_lvl1':undefined)
}
console.log('Onboarding persists per slot on entry without awarding victory/unlocks; old zero-star migration, fresh/deleted-slot isolation, comic2 first-win behavior, last-stage/XP roundtrip, invalid data and actual fresh/replay stage setup verified')
for(const seen of [false,true]){
 const progress=seen?recordIntroduction(started,'stage2'):started,game=new GameSession(read('level02'),read('level02-campaign'),templates,()=>.5)
 applyStageSetup(game,2,'campaign',false,false,false,progress.onboarding)
 assert.equal(!!game.heroes.zefiraIntro,!seen,'stage-two introduction also runs only once')
 assert.equal(game.cinematic,!seen)
}
