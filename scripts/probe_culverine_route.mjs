import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {heroUpgradeData,validateHeroUpgrades} from '../src/game/HeroUpgrades.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const holder=process.argv[2]??'7',variant=process.argv[3]??'culverine-mixed',read=p=>JSON.parse(readFileSync(p)),profile=read('analysis/native-runtime-video-continued-profile.json'),templates=read('public/data/entities.json'),commands=[]
for(const name of ['hero_gerald','hero_zefira']){profile.heroXp[name]=6500;profile.heroUpgrades[name]=validateHeroUpgrades(heroUpgradeData,name,6500,['skill_a','skill_b','upg_a','upg_d','upg_b'])}
profile.towers=['archers','knights','catapult','wizard','culverine']
writeFileSync(`analysis/native-runtime-${variant}-profile.json`,JSON.stringify(profile,null,2)+'\n')
const opening=read('analysis/native-runtime-video-continued-input.json').filter(c=>c.kind==='build'&&c.tick<=841||['hero-rally','rally','send_wave','power'].includes(c.kind)).map(c=>c.kind==='build'&&c.holder===holder?{...c,tower:'culverine'}:{...c})
const rain=opening.find(c=>c.tick===4362&&c.kind==='power'&&c.power==='rain_of_fire');if(rain){rain.tick=5502;rain.pos={x:-100,y:320}}
const guard=opening.find(c=>c.tick===5352&&c.kind==='power'&&c.power==='reinforcements');if(guard)guard.pos={x:-100,y:320}
let seed=104,draws=0,rayStates=0,auraStates=0,decalStates=0
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),templates,()=>{draws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',profile.towers,profile.powerUpgrades??{},profile.globalUpgrades)
g.heroes.savedXp=profile.heroXp;g.heroes.savedUpgrades=profile.heroUpgrades;g.heroes.playerLevel=3;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(profile.powerXp,3,1);applyStageSetup(g,3,'campaign',true,true)
const site=g.towers.sites.find(s=>s.id===holder)
for(let tick=1;tick<=30000&&!g.outcome;tick++){
 for(const c of opening.filter(c=>c.tick===tick)){
  if(c.kind==='build'){const price=g.towers.price(c.tower);if(g.gold<price){opening.push({...c,tick:tick+1});continue}g.build(c.holder,c.tower)}
  else if(c.kind==='send_wave'){if(!g.incomingWave)continue;g.callNextWave()}
  else if(c.kind==='hero-rally'){g.heroes.selectedId=g.heroes.team.find(h=>h.name===c.name).id;if(!g.heroes.moveSelected(c.pos))throw Error('Rejected hero rally')}
  else if(c.kind==='rally'){if(!g.setRally(c.holder,c.pos))continue}
  else if(c.kind==='power'){if(!g.powers.select(c.power,g.time)||!g.powers.cast(c.pos,g.time))continue}
  commands.push(c)
 }
 if(tick>841&&tick%15===0&&site.tower&&!site.building){
  const next=g.towers.nextUpgrade(site)
  if(process.argv.includes('--early-sale')&&next&&g.gold<next.price){
   const sales=['7','5','4'].map(id=>g.towers.sites.find(s=>s.id===id)).filter(s=>s?.id!==holder&&s?.tower&&!s.selling)
   if(g.gold+sales.reduce((n,s)=>n+g.towers.refund(s,g.waves.wave),0)>=next.price){let projected=g.gold;for(const sale of sales){if(projected>=next.price)break;projected+=g.towers.refund(sale,g.waves.wave);g.sellTower(sale.id);commands.push({tick,kind:'sell',holder:sale.id})}}
  }
  if(next&&g.gold>=next.price){g.upgradeTower(holder);commands.push({tick,kind:'upgrade',holder,tower:next.name})}
 }
 if(tick>841&&tick%30===0&&g.incomingWave&&!g.enemies.some(e=>e.hp>0&&e.escapedAt===undefined)){g.callNextWave();commands.push({tick,kind:'send_wave'})}
 g.advance(1/30);rayStates+=g.combat.nativeCulverine.rays.length;auraStates+=g.combat.nativeCulverine.auras.size;decalStates+=g.combat.nativeCulverine.decals.size
}
writeFileSync(`analysis/native-runtime-${variant}-input.json`,JSON.stringify(commands,null,2)+'\n')
console.log(JSON.stringify({tick:g.tick,gold:g.gold,outcome:g.outcome,draws,rayStates,auraStates,decalStates,tower:site.tower,commands},null,2))
