import {implementedTowerPowers} from '../src/game/TowerSystem.ts'
import {equippedTowers} from '../src/game/TowerProgression.ts'
import {heroUpgradeData,purchaseHeroUpgrade} from '../src/game/HeroUpgrades.ts'
import {equippedPowers} from '../src/game/NativeProgression.ts'
import {recordVictory,recordPowerXp} from '../src/game/ProgressStore.ts'
// Natural battle probe: uses original wave programs and normal player actions only.
import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),results=[]
const savedXp={};let profile={levels:{}}
for(let stage=1;stage<=3;stage++)for(const mode of ['campaign','iron']) {
 let seed=101+stage;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 const data=read(`public/data/level0${stage}.json`),program=read(`public/data/level0${stage}-${mode}.json`),g=new GameSession(data,program,templates,random,mode,equippedTowers(profile)),actions=[],waveTrace=[],escapeHistory=[],escaped=new WeakSet()
 let geraldNodes=profile.heroUpgrades?.hero_gerald??[]
 for(const id of ['skill_a','skill_b','upg_a','upg_sa1','upg_sb1','upg_sb2','upg_sa2','upg_d','upg_e','upg_b','upg_c']){const next=purchaseHeroUpgrade(heroUpgradeData,'hero_gerald',savedXp.hero_gerald??0,geraldNodes,id);if(next!==geraldNodes){geraldNodes=next;actions.push({at:0,action:'hero-skill-purchase',name:'hero_gerald',id})}}
 profile={...profile,heroUpgrades:{...profile.heroUpgrades,hero_gerald:geraldNodes}}
 let zefiraNodes=profile.heroUpgrades?.hero_zefira??[]
 for(const id of ['skill_a','skill_b','upg_b','upg_sa1','upg_sb1','upg_sa2','upg_sb2','upg_a','upg_c','upg_d','upg_e']){const next=purchaseHeroUpgrade(heroUpgradeData,'hero_zefira',savedXp.hero_zefira??0,zefiraNodes,id);if(next!==zefiraNodes){zefiraNodes=next;actions.push({at:0,action:'hero-skill-purchase',name:'hero_zefira',id})}}
 profile={...profile,heroUpgrades:{...profile.heroUpgrades,hero_zefira:zefiraNodes}}
 g.heroes.savedUpgrades=structuredClone(profile.heroUpgrades)
 g.onSound=name=>{if(['HeroGeraldInspireCourageCast','HeroGeraldShieldOfRetributionCast','HeroZefiraDazzlingHammerCast','HeroZefiraShieldingBladesCast'].includes(name))actions.push({at:g.time,action:'hero-skill-cast',name});if(['TowerScholarMageScrollOfKnowledgeCast','TowerArcherGarrisonEyeInTheSkyCast'].includes(name))actions.push({at:g.time,action:'tower-skill-cast',name})}
 g.heroes.savedXp={...savedXp};g.heroes.playerLevel=stage+1
 g.powers.equip(equippedPowers(profile));g.powers.progression.configure(profile.powerXp,stage+1,mode==='campaign'?1:3)
 applyStageSetup(g,stage,mode,true,true)
 const traffic=new Map();for(const command of program.commands)for(const spawn of command.spawns??[])traffic.set(spawn.pi,(traffic.get(spawn.pi)??0)+1)
 const roads=[];for(const [pi,lanes] of data.paths.paths.entries())if(traffic.has(pi+1)){const end=data.navigation?.ends[pi]??lanes[0].length;for(let n=0;n<end;n+=8)roads.push({pos:lanes[0][n],weight:(traffic.get(pi+1)??1)*(1+(n/end)**2*3)})}
 const kinds=['archers','wizard','catapult','knights','culverine'].filter(k=>g.towers.available.includes(`tower_build_${k}`))
 const value=(site,kind)=>{const range=templates[`tower_${kind}_lvl1`].attacks?.range??100;let score=0;for(const point of roads){const d=(point.pos.x-site.pos.x)**2+((point.pos.y-site.pos.y)/.7)**2;if(d<range**2)score+=point.weight*(1-d/range**2)}for(const other of g.towers.sites)if(other.tower&&other.id!==site.id){const d=Math.hypot(other.pos.x-site.pos.x,other.pos.y-site.pos.y);if(d<130)score*=.75}return score}
 const observedOpening=process.env.KR6_PROBE_OPENING==='observed'&&stage===3&&mode==='iron'
 const opening=observedOpening?[['build','7','catapult'],['build','4','catapult'],['build','5','catapult'],['build','6','wizard'],['build','10','wizard'],['build','11','wizard'],['build','8','wizard'],['build','1','wizard']]:mode==='iron'&&stage===2?[['build','3','knights'],['build','8','knights'],['build','4','wizard'],['upgrade','1'],['build','6','wizard'],['build','2','wizard']]:mode==='iron'&&stage===3?[['build','5','catapult'],['build','7','catapult'],['build','4','catapult'],['build','6','wizard'],['build','10','wizard'],['build','1','wizard'],['build','8','wizard'],['build','11','wizard']]:[]
 const spend=()=>{
  if(opening.length){const [action,id,kind]=opening[0],site=g.towers.sites.find(s=>s.id===id),price=action==='build'?templates[`tower_${kind}_lvl1`].tower.price:g.towers.nextUpgrade(site)?.price;if(price===undefined||price>g.gold)return;if(action==='build')g.build(id,kind);else g.upgradeTower(id);opening.shift();actions.push({at:g.time,action,site:id,kind,tower:site.tower});return}
  const count=g.towers.sites.filter(s=>s.tower||s.building).length
  if(count>=(mode==='iron'?9:4)){const upgrades=g.towers.sites.filter(s=>s.tower&&g.towers.nextUpgrade(s)?.price<=g.gold).sort((a,b)=>templates[a.tower].tower.level-templates[b.tower].tower.level||value(b,templates[b.tower].tower.type)-value(a,templates[a.tower].tower.type));if(upgrades[0]){g.upgradeTower(upgrades[0].id);actions.push({at:g.time,action:'upgrade',site:upgrades[0].id,tower:upgrades[0].tower});return}}
  const powers=g.towers.sites.flatMap(site=>(implementedTowerPowers[templates[site.tower]?.tower?.type]??[]).map(power=>({site,power,next:g.towers.nextPower(site,power)}))).filter(item=>item.next&&item.next.price<=g.gold).sort((a,b)=>a.next.level-b.next.level)
  if(powers[0]){const {site,power,next}=powers[0];g.upgradeTowerPower(site.id,power);actions.push({at:g.time,action:'tower-power-purchase',site:site.id,power,level:next.level});return}
  const kind=kinds[count%kinds.length],price=templates[`tower_${kind}_lvl1`].tower.price
  if(g.gold<price)return
  const site=g.towers.sites.filter(s=>!s.tower&&!s.building&&s.canBeModified!==false).sort((a,b)=>value(b,kind)-value(a,kind))[0]
  if(site){g.build(site.id,kind);actions.push({at:g.time,action:'build',site:site.id,kind})}
 }
 const heroPositions=stage===1?{hero_gerald:{x:600,y:330},hero_zefira:{x:650,y:410}}:stage===2?{hero_gerald:{x:520,y:315},hero_zefira:{x:550,y:415}}:{hero_gerald:{x:-68,y:331},hero_zefira:{x:464,y:684}}
 if(stage===3&&['video','video-guard'].includes(process.env.KR6_PROBE_HERO_RALLY)){heroPositions.hero_gerald={x:549.3333333333334,y:282.6666666666667};heroPositions.hero_zefira={x:522.6666666666667,y:283.73333333333335}}
 if(stage===2&&process.env.KR6_PROBE_HERO_RALLY==='video-guard')heroPositions.hero_zefira={x:550,y:320}
 for(const hero of g.heroes.team){g.heroes.selectedId=hero.id;if(g.heroes.moveSelected(heroPositions[hero.name]))actions.push({at:g.time,action:'hero-rally',name:hero.name,pos:heroPositions[hero.name]})}
 let lastWave=-1
 for(let frame=0;frame<30*1800&&!g.outcome;frame++){
  if(frame%10===0&&!g.cinematic){
   spend()
   for(const site of g.towers.sites)if(site.tower?.startsWith('tower_knights')&&!site.probeRallied){const point=[...(observedOpening&&site.id==='9'?[{x:570.6666666666666,y:321.06666666666666}]:[]),site.rally,...roads.map(p=>p.pos).sort((a,b)=>Math.hypot(a.x-site.pos.x,a.y-site.pos.y)-Math.hypot(b.x-site.pos.x,b.y-site.pos.y))].find(p=>g.setRally(site.id,p));if(point){site.probeRallied=true;actions.push({at:g.time,action:'rally',site:site.id,pos:point})}}
   if(g.waves.waitingForWave&&g.time>=10){g.callNextWave();actions.push({at:g.time,action:'wave'})}
   const enemies=g.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined).sort((a,b)=>a.path.remainingNodes-b.path.remainingNodes)
   if(enemies.length&&g.waves.wave>0){
    const first=enemies[0]
    if(process.env.KR6_PROBE_HERO_RALLY==='video-guard'&&first.path.remainingNodes<140&&first.path.position.x>=-512/3&&first.path.position.x<=1024+512/3&&first.path.position.y>=0&&first.path.position.y<=768){
     const preferred=first.path.position.y>550?'hero_zefira':'hero_gerald',hero=g.heroes.team.find(h=>h.name===preferred&&h.hp>0)
     if(hero&&!hero.scriptLocked&&g.time-(hero.probeGuardAt??-100)>5&&Math.hypot(hero.pos.x-first.path.position.x,hero.pos.y-first.path.position.y)>80){
      g.heroes.selectedId=hero.id;if(g.heroes.moveSelected(first.path.position)){hero.probeGuardAt=g.time;actions.push({at:g.time,action:'hero-guard',name:hero.name,pos:{...first.path.position},target:first.id})}
     }
    }
    if(g.powers.remaining('reinforcements',g.time)<=0 && !(first.template.vis.flags&128) && (first.path.remainingNodes<140||g.towers.sites.some(s=>s.tower&&Math.hypot(s.pos.x-first.path.position.x,s.pos.y-first.path.position.y)<140))){if(g.powers.select('reinforcements',g.time)&&g.powers.cast(first.path.position,g.time))actions.push({at:g.time,action:'reinforcements',pos:{...first.path.position}})}
    if(g.powers.remaining('rain_of_fire',g.time)<=0){
     const heavy=enemies.filter(e=>e.name==='enemy_blackguard').sort((a,b)=>a.path.remainingNodes-b.path.remainingNodes),target=heavy[0]
     if(target && (heavy.filter(e=>Math.hypot(e.path.position.x-target.path.position.x,(e.path.position.y-target.path.position.y)/.7)<80).length>=2 || target.path.remainingNodes<70)) {
      const pos=target.path.predict(target.template.motion.max_speed*.8);if(pos.x>=-512/3&&pos.x<=1024+512/3&&pos.y>=0&&pos.y<=768){if(g.powers.select('rain_of_fire',g.time)&&g.powers.cast(pos,g.time))actions.push({at:g.time,action:'rain_of_fire',pos:{...pos}})}
     }
    }
    if(g.powers.equipped.includes('royal_edict')&&g.powers.remaining('royal_edict',g.time)<=0&&enemies.length>=4){
     const towers=g.towers.sites.filter(s=>s.tower),positions=towers.map(s=>s.pos)
     for(let i=0;i<towers.length;i++)for(let j=i+1;j<towers.length;j++)positions.push({x:(towers[i].pos.x+towers[j].pos.x)/2,y:(towers[i].pos.y+towers[j].pos.y)/2})
     const score=pos=>towers.reduce((sum,s)=>sum+((s.pos.x-pos.x)**2+((s.pos.y-pos.y)/.7)**2<=g.powers.royal.control.range**2?(enemies.some(e=>Math.hypot(e.path.position.x-s.pos.x,(e.path.position.y-s.pos.y)/.7)<180)?1:.1):0),0)
     const pos=positions.sort((a,b)=>score(b)-score(a))[0]
     if(pos&&score(pos)>=1.8&&g.powers.select('royal_edict',g.time)&&g.powers.cast(pos,g.time))actions.push({at:g.time,action:'royal_edict',pos:{...pos}})
    }
   }
  }
  g.advance(1/30)
  for(const e of g.enemies)if(e.escapedAt!==undefined&&!escaped.has(e)){escaped.add(e);escapeHistory.push({id:g.entities?.entity(e)?.id,name:e.name,at:e.escapedAt,hp:e.hp,pos:{...e.path.position},pi:e.path.pi,node:e.path.ni})}
  if(g.waves.wave!==lastWave){lastWave=g.waves.wave;waveTrace.push({at:g.time,wave:lastWave,lives:g.lives,gold:g.gold})}
 }
 if(g.outcome)profile=recordVictory(profile,stage,mode,g.outcome)
 profile=recordPowerXp(profile,g.powers.progression.snapshot())
 for(const h of g.heroes.team)savedXp[h.name]=h.xp
 const result={stage,mode,outcome:g.outcome??'timeout',time:g.time,lives:g.lives,gold:g.gold,waves:g.waves.wave,enemies:g.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined).length,powerXp:g.powers.progression.snapshot(),equippedPowers:g.powers.equipped,equippedTowers:g.towers.available,heroUpgrades:structuredClone(profile.heroUpgrades),heroes:g.heroes.team.map(h=>({name:h.name,level:h.level,xp:h.xp})),escapes:escapeHistory,waveTrace,actions}
 results.push(result);console.log(JSON.stringify({stage,mode,outcome:result.outcome,time:g.time,lives:g.lives,waves:g.waves.wave,actions:actions.length}))
}
writeFileSync(process.env.KR6_PROBE_OUTPUT??'analysis/full-playthrough-probe.json',JSON.stringify({opening:process.env.KR6_PROBE_OPENING??'legacy',heroRally:process.env.KR6_PROBE_HERO_RALLY??'legacy',note:'Unmodified original waves, deterministic RNG, normal build/upgrade/rally/wave/power commands, including supported tower B purchases; campaign replays with introductory scripts already completed. This is a battle probe, not video fidelity acceptance.',results},null,2))
