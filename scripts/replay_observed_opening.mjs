import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
import {heroUpgradeData,validateHeroUpgrades} from '../src/game/HeroUpgrades.ts'
import {validateGlobalUpgrades,globalUpgradeSpent,globalUpgradePoints} from '../src/game/GlobalUpgrades.ts'
import {heroLevel} from '../src/game/HeroProgression.ts'
import {powerLevel} from '../src/game/PowerProgression.ts'
const read=p=>JSON.parse(readFileSync(p)),input=read('analysis/reference-inputs/page06-opening.json'),templates=read('public/data/entities.json'),level=read('public/data/level03.json'),program=read('public/data/level03-iron.json'),old=read('analysis/full-playthrough-probe.json').results,previous=old.find(r=>r.stage===3&&r.mode==='campaign'),oldIron=old.find(r=>r.stage===3&&r.mode==='iron')
const world=([x,y])=>({x:x/input.projection.scale+input.projection.left,y:input.projection.height-y/input.projection.scale})
for(const a of input.actions){assert(a.window[0]<=a.window[1]);for(const f of a.evidence)assert(existsSync('analysis/video-iron/'+f),f)}
assert.equal(input.actions.filter(a=>a.action==='build'&&a.window[1]<62).reduce((sum,a)=>sum+templates[`tower_${a.kind}_lvl1`].tower.price,0),530)
const defaultNodes={hero_gerald:['skill_a','skill_b','upg_a'],hero_zefira:['skill_a','skill_b','upg_a']}
const profiles=[
 {name:'legacy-entry',xp:Object.fromEntries(previous.heroes.map(h=>[h.name,h.xp])),powerXp:previous.powerXp,nodes:oldIron.heroUpgrades},
 {name:'video-level-floor',xp:{hero_gerald:1000,hero_zefira:4000},powerXp:{reinforcements:6000,rain_of_fire:6000,royal_edict:6000},nodes:defaultNodes},
 {name:'video-bar-low',xp:{hero_gerald:3400,hero_zefira:5350},powerXp:{reinforcements:6000,rain_of_fire:6000,royal_edict:6000},nodes:defaultNodes},
 {name:'video-bar-mid',xp:{hero_gerald:3500,hero_zefira:5500},powerXp:{reinforcements:6000,rain_of_fire:6000,royal_edict:6000},nodes:defaultNodes},
 {name:'video-bar-high',xp:{hero_gerald:3600,hero_zefira:5700},powerXp:{reinforcements:6300,rain_of_fire:6300,royal_edict:6300},nodes:defaultNodes}
]
const budget=globalUpgradePoints({levels:{3:{campaign:3}}})
for(const mages of [['l1'],['l1','l2']])for(const archers of [[],['l1'],['l1','l2']])for(const barracks of [[],['l1'],['l1','l2']])for(const artillery of [[],['l1'],['l1','l2']]){
 const globalUpgrades={mages,archers,barracks,artillery};if(globalUpgradeSpent(globalUpgrades)>budget)continue
 profiles.push({...profiles[3],name:'native-global-'+Object.entries(globalUpgrades).filter(([,ids])=>ids.length).map(([kind,ids])=>kind+':'+ids.join('+')).join('/'),globalUpgrades:validateGlobalUpgrades(budget,globalUpgrades)})
}

function run(profile,{seed=104,sceneStart=13.5,windowFraction=.5,endMedia=input.coverageMediaSeconds[1],captureActors=false}={}){
 const initialSeed=seed;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},g=new GameSession(level,program,templates,random,'iron',undefined,{},profile.globalUpgrades),accepted=[],rejected=[],samples=[],deaths=[],hits=[],shots=[],catapultFrames=[],wizardShots=[]
 g.heroes.savedXp={...profile.xp};g.heroes.playerLevel=4;g.heroes.savedUpgrades=Object.fromEntries(Object.entries(profile.nodes).map(([k,nodes])=>[k,validateHeroUpgrades(heroUpgradeData,k,profile.xp[k]??0,nodes)]));g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(profile.powerXp,4,3);applyStageSetup(g,3,'iron',true,true)
 const initial={globalUpgrades:profile.globalUpgrades??{},pointsSpent:globalUpgradeSpent(profile.globalUpgrades??{}),heroes:g.heroes.team.map(h=>({name:h.name,xp:h.xp,level:h.level})),powerLevels:Object.fromEntries(Object.entries(profile.powerXp).map(([k,xp])=>[k,powerLevel(xp)])),heroUpgrades:g.heroes.savedUpgrades}
 const nativeShoot=g.combat.catapultTowers.onShoot;g.combat.catapultTowers.onShoot=(...args)=>{shots.push({media:g.time+sceneStart,site:args[0].id,name:args[1],from:args[2],to:args[3],factor:args[4]});nativeShoot(...args)}
 if(captureActors){const draw=g.combat.wizardTowers.random;g.combat.wizardTowers.random=()=>{draw();return .75};const shoot=g.combat.wizardTowers.onShoot;g.combat.wizardTowers.onShoot=(...args)=>{wizardShots.push({at:g.time,site:args[0].id,name:args[1],from:{...args[2]},target:args[3].id,sign:args[4]});shoot(...args)};const advance=g.combat.advance.bind(g.combat);g.combat.advance=(time,sites,enemies,interleave)=>{
  const frame={at:time,wave:g.waves.wave,sources:sites.filter(s=>s.tower?.startsWith('tower_catapult_')).map(s=>({id:s.id,name:s.tower,pos:{...s.pos},instance:s.instance??0})),wizardSources:sites.filter(s=>s.tower?.startsWith('tower_wizard_lvl')).map(s=>({id:s.id,name:s.tower,pos:{...s.pos},instance:s.instance??0})),actors:enemies.filter(e=>e.hp>0&&e.escapedAt===undefined).map(e=>{const moving=!(e.blocked||e.meleeHolding||e.frozen||e.rangedHolding||e.skillLocked||e.template.unit.is_stunned),speed=moving?e.template.motion.max_speed:0;return{moving,id:e.id,name:e.name,hp:e.hp,pi:e.path.pi,spi:e.path.spi,ni:e.path.ni,pos:{...e.path.position},motion:{x:e.path.direction.x*speed,y:e.path.direction.y*speed},maxSpeed:e.template.motion.max_speed,flags:e.frozen?4096:e.template.vis.flags,bans:e.template.vis.bans}})}
  advance(time,sites,enemies,interleave);frame.states=[...g.combat.catapultTowers.states.entries()].map(([id,s])=>({id,key:s.key,parts:s.parts.map(p=>({...p})),attackTs:s.attackTs,direction:s.direction,phase:s.phase}));frame.wizardStates=[...g.combat.wizardTowers.states.entries()].map(([id,s])=>({id,key:s.key,parts:s.parts.map(p=>({...p,offset:{...p.offset}})),attackTs:s.ts,loading:s.loading,bobTime:s.bobTime}));catapultFrames.push(frame)
 }}
 const actions=input.actions.map(a=>({...a,media:a.window[0]+Math.min(a.window[1]-a.window[0],Math.max(1/30,(a.window[1]-a.window[0])*windowFraction)),pos:a.pixel&&world(a.pixel)})).sort((a,b)=>a.media-b.media)
 let cursor=0,sampleCursor=0;const known=new Map(),dead=new Set()
 while(g.time+sceneStart<=endMedia+1e-9&&!g.outcome){
  const media=g.time+sceneStart
  while(cursor<actions.length&&actions[cursor].media<=media+1e-9){
   const a=actions[cursor++],entry={media,action:a.action,site:a.site,name:a.name,kind:a.kind,pos:a.pos,confidence:a.confidence,goldBefore:g.gold}
   try{
    let result
    if(a.action==='build')result=g.build(a.site,a.kind)
    else if(a.action==='rally')result=g.setRally(a.site,a.pos)
    else if(a.action==='hero-rally'){g.heroes.selectedId=g.heroes.team.find(h=>h.name===a.name)?.id;result=g.heroes.moveSelected(a.pos)}
    else if(a.action==='wave')result=g.callNextWave()
    else result=g.powers.select(a.action,g.time)&&g.powers.cast(a.pos,g.time)
    if(result===false)rejected.push({...entry,reason:'rejected'});else accepted.push({...entry,goldAfter:g.gold})
   }catch(e){rejected.push({...entry,reason:e.message})}
  }
  while(sampleCursor<input.goldCheckpoints.length&&input.goldCheckpoints[sampleCursor].media<=media+1e-9){const c=input.goldCheckpoints[sampleCursor++];samples.push({media:c.media,gold:g.gold,expectedGold:c.gold,goldDelta:g.gold-c.gold,lives:g.lives,wave:g.waves.wave,heroes:g.heroes.team.map(h=>({name:h.name,pos:{...h.pos},hp:h.hp,xp:h.xp,level:h.level})),towers:g.towers.sites.filter(s=>s.tower).map(s=>({id:s.id,tower:s.tower,rally:s.rally})),enemies:g.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined).map(e=>({id:e.id,name:e.name,hp:e.hp,pos:{...e.path.position},blocked:e.blocked,ni:e.path.ni,pi:e.path.pi}))})}
  if(media>=endMedia-1e-9)break
  g.advance(1/30)
  for(const e of g.enemies){const hp=known.get(e.id);if(hp!==undefined&&hp!==e.hp)hits.push({media:g.time+sceneStart,id:e.id,name:e.name,before:hp,after:e.hp,pos:{...e.path.position}});known.set(e.id,e.hp);if(e.diedAt!==undefined&&!dead.has(e.id)){dead.add(e.id);deaths.push({media:g.time+sceneStart,id:e.id,name:e.name,pos:{...e.path.position}})}}
 }
 return {profile:profile.name,seed:initialSeed,sceneStart,windowFraction,initial,accepted,rejected,wizardShots:captureActors?wizardShots:undefined,catapultFrames:captureActors?catapultFrames:undefined,unreached:actions.slice(cursor),samples,deaths,hits,shots,outcome:g.outcome??'coverage-end',mediaEnd:g.time+sceneStart,escapes:g.enemies.filter(e=>e.escapedAt!==undefined).map(e=>({id:e.id,name:e.name,hp:e.hp,pos:{...e.path.position},media:e.escapedAt+sceneStart}))}
}
if(process.argv.includes('--scan-rng')){
 const rows=[]
 for(const profile of profiles.filter(p=>['native-global-mages:l1','native-global-mages:l1/artillery:l1','native-global-mages:l1/artillery:l1+l2'].includes(p.name)))for(let seed=1;seed<=200;seed++){
  const r=run(profile,{seed,endMedia:82}),samples=r.samples.map(({media,gold,expectedGold})=>({media,gold,expectedGold})),first=samples.find(s=>s.gold!==s.expectedGold)
  rows.push({profile:r.profile,seed,firstDivergence:first,matchingSamples:samples.filter(s=>s.gold===s.expectedGold).length,samples,firstShots:r.shots.slice(0,4),deaths:r.deaths})
 }
 writeFileSync('analysis/observed-opening-rng-scan.json',JSON.stringify({note:'Uncertain RNG diagnostic only, original mechanics with legal4-point profiles. Fixed middle command/scene windows, media14–82, seeds1–200 per profile. A matching prefix would not identify the original RNG or prove full-video fidelity.',rows},null,2))
 for(const profile of [...new Set(rows.map(r=>r.profile))]){const cases=rows.filter(r=>r.profile===profile),best=cases.reduce((a,b)=>a.matchingSamples>=b.matchingSamples?a:b);console.log(JSON.stringify({profile,cases:cases.length,gold77:[...new Set(cases.map(r=>r.samples.find(s=>s.media===77).gold))].sort((a,b)=>a-b),exactPrefixes:cases.filter(r=>!r.firstDivergence).length,best}))}
}else if(process.argv.includes('--capture-catapult')){
 const profile=profiles.find(p=>p.name==='native-global-mages:l1/artillery:l1+l2'),r=run(profile,{captureActors:true,endMedia:82})
 assert(r.shots.length>0&&r.wizardShots.length>0,'opening capture must execute real source dispatch and emit both tower families')
 writeFileSync('analysis/catapult-opening-input.json',JSON.stringify({note:'Input-driven differential oracle: wizard pairing roll is fixed at0.75; actor poses/HP/order are prescribed from the web opening BEFORE combat each tick. This tests original acquisition plus tower coroutines on the same real-path inputs, not independent full-game fidelity.',actorPhase:'before-enemy-main',stage:3,wizardPairRoll:.75,sceneStart:r.sceneStart,profile:r.initial,frames:r.catapultFrames,shots:r.shots,wizardShots:r.wizardShots},null,2))
 console.log(r.catapultFrames.length+' pre-combat actor/source frames and '+r.shots.length+' actual catapult shots captured')
}else{
const results=profiles.map(p=>run(p));for(const fraction of [0,1])results.push(run(profiles[3],{windowFraction:fraction}));for(const sceneStart of [13,14])results.push(run(profiles[3],{sceneStart}));for(const seed of [105,106])results.push(run(profiles[3],{seed}))
writeFileSync('analysis/observed-opening-replay.json',JSON.stringify({note:'Diagnostic opening through media120 only. Native maps/waves/stats and normal commands; fixed observed command windows, no automatic spells/spending and no retry of unaffordable builds. Hero/rally release points, exact profiles, global upgrades and RNG are uncertain. coverage-end is not victory or video acceptance.',input:'analysis/reference-inputs/page06-opening.json',results},null,2))
for(const r of results)console.log(JSON.stringify({profile:r.profile,seed:r.seed,sceneStart:r.sceneStart,fraction:r.windowFraction,outcome:r.outcome,end:r.mediaEnd,firstGoldDivergence:r.samples.find(s=>s.goldDelta!==0),rejected:r.rejected,escapes:r.escapes},(k,v)=>['heroes','towers','enemies'].includes(k)?undefined:v))

}
