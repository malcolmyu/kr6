import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const culverine=process.argv.includes('--culverine'),special=process.argv.includes('--reinforcement-special'),knightLegacy=special||process.argv.includes('--knight-legacy'),knightHeal=process.argv.includes('--knight-heal'),knightArmor=process.argv.includes('--knight-armor'),empower=process.argv.includes('--empower'),range=process.argv.includes('--range'),pierce=process.argv.includes('--pierce'),markFull=process.argv.includes('--mark-full'),mark=markFull||process.argv.includes('--mark'),copies=process.argv.includes('--copies'),survivor=process.argv.includes('--survivor'),firebook=process.argv.includes('--firebook'),defeat=culverine||knightLegacy||knightHeal||knightArmor||empower||survivor||firebook||copies||mark||pierce||range,scenario=culverine?'culverine-mixed':special?'knight-legacy-special-mixed':knightLegacy?'knight-legacy-mixed':knightHeal?'knight-heal-mixed':knightArmor?'knight-armor-mixed':empower?'wizard-empower-mixed':range?'archers-range-mixed':pierce?'archers-pierce-mixed':markFull?'archers-mark-complete':mark?'archers-mark-mixed':copies?'wizard-copies-mixed':firebook?'firebook-mixed':survivor?'survivor':'video-continued',artifact=culverine?'culverine-mixed-':special?'knight-legacy-special-mixed-':knightLegacy?'knight-legacy-mixed-':knightHeal?'knight-heal-mixed-':knightArmor?'knight-armor-mixed-':empower?'wizard-empower-mixed-':range?'archers-range-mixed-':pierce?'archers-pierce-mixed-':markFull?'archers-mark-complete-':mark?'archers-mark-mixed-':copies?'wizard-copies-mixed-':firebook?'firebook-mixed-':survivor?'survivor-':''
const read=p=>JSON.parse(readFileSync(p)),native=read(`analysis/native-${artifact}battle-sounds.json`),profile=read(`analysis/native-runtime-${scenario}-profile.json`),commands=read(`analysis/native-runtime-${scenario}-input.json`)
let seed=104,draws=0,inputTick
const g=new GameSession(read('public/data/level03.json'),read(culverine||knightLegacy||knightHeal||knightArmor||empower||mark||pierce||range?'public/data/level03-campaign.json':'public/data/level03-iron.json'),read('public/data/entities.json'),()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;draws++;return seed/4294967296},culverine||knightLegacy||knightHeal||knightArmor||empower||mark||pierce||range?'campaign':'iron',profile.towers??['archers','knights','catapult','wizard'],profile.powerUpgrades??{},profile.globalUpgrades)
const sounds=[]
g.onSound=name=>sounds.push({tick:g.tick,name,input:inputTick!==undefined})
g.heroes.savedXp=profile.heroXp;g.heroes.savedUpgrades=profile.heroUpgrades;g.heroes.playerLevel=firebook||copies||culverine||knightLegacy||knightHeal||knightArmor||empower||mark||pierce||range?3:4;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(profile.powerXp,firebook||copies||culverine||knightLegacy||knightHeal||knightArmor||empower||mark||pierce||range?3:4,culverine||knightLegacy||knightHeal||knightArmor||empower||mark||pierce||range?1:3);applyStageSetup(g,3,culverine||knightLegacy||knightHeal||knightArmor||empower||mark||pierce||range?'campaign':'iron',true,true)
for(let tick=1;tick<=native.tick;tick++){
 inputTick=tick
 for(const c of commands.filter(c=>c.tick===tick)){
  if(c.kind==='send_wave')g.callNextWave()
  else if(c.kind==='hero-rally'){g.heroes.selectedId=g.heroes.team.find(h=>h.name===c.name).id;assert(g.heroes.moveSelected(c.pos))}
  else if(c.kind==='rally')assert(g.setRally(c.holder,c.pos))
  else if(c.kind==='power'){assert(g.powers.select(c.power,g.time));assert(g.powers.cast(c.pos,g.time))}
  else if(c.kind==='tower-power')g.upgradeTowerPower(c.holder,c.power)
  else if(c.kind==='sell')g.sellTower(c.holder)
  else if(c.kind==='upgrade')g.upgradeTower(c.holder)
  else g.build(c.holder,c.tower)
 }
 inputTick=undefined;g.advance(1/30)
}
assert.equal(g.gold,native.gold);assert.equal(g.lives,native.lives);assert.equal(draws,native.random);assert.equal(g.entities.events.length,native.events)
writeFileSync(`analysis/web-${artifact}battle-sounds.json`,JSON.stringify(sounds,null,2)+'\n')
// This original engine harness installs got-gold but has no GUI wave signal
// listener. That one GUI request is checked separately, not discarded by origin.
assert.deepEqual(sounds.filter(s=>s.name==='GUINextWaveIncoming').map(s=>s.tick),culverine||knightLegacy||knightHeal||knightArmor||empower||mark||pierce||range?native.waveTicks:[1464])
assert.deepEqual(sounds.filter(s=>s.name==='GUIStageDefeat').map(s=>s.tick),empower?(native.outcome&&!native.outcome.victory?[native.tick]:[]):defeat?[native.tick]:[])
const expected=native.sounds.filter(s=>s.name).map(({tick,name})=>({tick,name})),actual=sounds.filter(s=>s.name!=='GUINextWaveIncoming'&&s.name!=='GUIStageDefeat').map(({tick,name})=>({tick,name}))
let i=0;while(i<Math.min(expected.length,actual.length)&&expected[i].tick===actual[i].tick&&expected[i].name===actual[i].name)i++
console.log({native:expected.length,web:actual.length,firstDifference:i,expected:expected.slice(i,i+6),actual:actual.slice(i,i+6)})
assert.deepEqual(actual,expected,'Original engine sound request order/timing; GUI wave signal checked separately')
