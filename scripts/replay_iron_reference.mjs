import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'

// Diagnostic comparisons, not video acceptance. No wave/entity/stat overrides.
const read=path=>JSON.parse(readFileSync(path)),templates=read('public/data/entities.json')
const trace=read('analysis/full-playthrough-probe.json').results
function create(stage){
 const base=trace.find(r=>r.stage===stage&&r.mode==='iron'),previous=trace[trace.indexOf(base)-1]
 let seed=101+stage;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 const g=new GameSession(read(`public/data/level0${stage}.json`),read(`public/data/level0${stage}-iron.json`),templates,random,'iron',base.equippedTowers)
 g.heroes.savedUpgrades=structuredClone(base.heroUpgrades)
 g.heroes.savedXp=Object.fromEntries(previous.heroes.map(h=>[h.name,h.xp]));g.heroes.playerLevel=stage+1
 g.powers.equip(base.equippedPowers);g.powers.progression.configure(previous.powerXp,stage+1,3);applyStageSetup(g,stage,'iron',true,true)
 return {g,base}
}
function command(g,a){
 if(a.action==='build')return g.build(a.site,a.kind)
 if(a.action==='upgrade')return g.upgradeTower(a.site)
 if(a.action==='rally')return g.setRally(a.site,a.pos)
 if(a.action==='hero-rally'){g.heroes.selectedId=g.heroes.team.find(h=>h.name===a.name)?.id;return g.heroes.moveSelected(a.pos)}
 if(a.action==='wave')return g.callNextWave()
 if(['reinforcements','rain_of_fire','royal_edict'].includes(a.action))return g.powers.select(a.action,g.time)&&g.powers.cast(a.pos,g.time)
 if(a.action==='tower-power-purchase')return g.upgradeTowerPower(a.site,a.power)
 return true
}
function result(g){return {outcome:g.outcome??'timeout',time:g.time,lives:g.lives,gold:g.gold,powerXp:g.powers.progression.snapshot(),heroes:g.heroes.team.map(h=>({name:h.name,level:h.level,xp:h.xp})),escapes:g.enemies.filter(e=>e.escapedAt!==undefined).map(e=>({name:e.name,at:e.escapedAt,hp:e.hp,pos:e.path.position}))}}
function replay(stage){
 const {g,base}=create(stage);let cursor=0
 for(let tick=0;tick<30*1800&&!g.outcome;tick++){
  while(cursor<base.actions.length&&base.actions[cursor].at<=g.time+1e-9){const a=base.actions[cursor++];assert.notEqual(command(g,a),false,`baseline rejected ${JSON.stringify(a)}`)}
  g.advance(1/30)
 }
 const actual=result(g)
 for(const key of ['outcome','time','lives','gold','powerXp','heroes','escapes'])assert.deepEqual(actual[key],base[key],`stage${stage} baseline ${key}`)
 return {stage,variant:'exact-command-baseline',...actual}
}

// Same automatic power policy as the old probe. Kept separate from the observed
// opening so a better outcome cannot be misreported as exact video playback.
function autoPowers(g){
 const enemies=g.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined).sort((a,b)=>a.path.remainingNodes-b.path.remainingNodes),out=[]
 if(!enemies.length||g.waves.wave<=0)return out
 const cast=(action,pos)=>{if(g.powers.select(action,g.time)&&g.powers.cast(pos,g.time))out.push({at:g.time,action,pos:{...pos}})}
 const first=enemies[0]
 if(g.powers.remaining('reinforcements',g.time)<=0&&!(first.template.vis.flags&128)&&(first.path.remainingNodes<140||g.towers.sites.some(s=>s.tower&&Math.hypot(s.pos.x-first.path.position.x,s.pos.y-first.path.position.y)<140)))cast('reinforcements',first.path.position)
 if(g.powers.remaining('rain_of_fire',g.time)<=0){
  const heavy=enemies.filter(e=>e.name==='enemy_blackguard'),target=heavy[0]
  if(target&&(heavy.filter(e=>Math.hypot(e.path.position.x-target.path.position.x,(e.path.position.y-target.path.position.y)/.7)<80).length>=2||target.path.remainingNodes<70)){
   const pos=target.path.predict(target.template.motion.max_speed*.8)
   if(pos.x>=-512/3&&pos.x<=1024+512/3&&pos.y>=0&&pos.y<=768)cast('rain_of_fire',pos)
  }
 }
 if(g.powers.equipped.includes('royal_edict')&&g.powers.remaining('royal_edict',g.time)<=0&&enemies.length>=4){
  const towers=g.towers.sites.filter(s=>s.tower),positions=towers.map(s=>s.pos)
  for(let i=0;i<towers.length;i++)for(let j=i+1;j<towers.length;j++)positions.push({x:(towers[i].pos.x+towers[j].pos.x)/2,y:(towers[i].pos.y+towers[j].pos.y)/2})
  const score=pos=>towers.reduce((sum,s)=>sum+((s.pos.x-pos.x)**2+((s.pos.y-pos.y)/.7)**2<=g.powers.royal.control.range**2?(enemies.some(e=>Math.hypot(e.path.position.x-s.pos.x,(e.path.position.y-s.pos.y)/.7)<180)?1:.1):0),0)
  const pos=positions.sort((a,b)=>score(b)-score(a))[0]
  if(pos&&score(pos)>=1.8)cast('royal_edict',pos)
 }
 return out
}
function candidate({centralRallies=false,centralHeroes=false,videoOpening=false,laterWave=false}){
 const {g,base}=create(2),actions=[],rejected=[],samples=[]
 const heroPositions=centralHeroes?{hero_gerald:{x:550,y:315},hero_zefira:{x:550,y:315}}:{hero_gerald:{x:520,y:315},hero_zefira:{x:550,y:415}}
 for(const hero of g.heroes.team){const a={at:0,action:'hero-rally',name:hero.name,pos:heroPositions[hero.name]};assert.notEqual(command(g,a),false);actions.push(a)}
 const opening=videoOpening?[
  {after:0,action:'build',site:'3',kind:'knights'},
  {after:0,action:'build',site:'8',kind:'knights'},
  {after:31,action:'build',site:'4',kind:'wizard'},
  // Video upper mage is between APK holders6/7. Holder6 is a hypothesis.
  {after:60,action:'build',site:'6',kind:'wizard'},
  {after:60,action:'build',site:'9',kind:'wizard'},
  {after:100,action:'build',site:'2',kind:'knights'},
 ]:base.actions.filter(a=>['build','upgrade','tower-power-purchase'].includes(a.action)).map(a=>({...a,after:a.at}))
 let cursor=0;const rallied=new Set()
 for(let tick=0;tick<30*600&&!g.outcome;tick++){
  if(tick%10===0){
   const a=opening[cursor]
   if(a&&g.time>=a.after){const site=g.towers.sites.find(s=>s.id===a.site),price=a.action==='build'?templates[`tower_${a.kind}_lvl1`].tower.price:g.towers.nextUpgrade(site)?.price
    if(price!==undefined&&price<=g.gold){if(command(g,a)!==false){actions.push({...a,at:g.time});cursor++}else{rejected.push({...a,at:g.time});cursor++}}
   }
   for(const site of g.towers.sites)if(site.tower?.startsWith('tower_knights')&&!rallied.has(site.id)){
    const pos=centralRallies&&site.id==='3'?{x:500,y:315}:centralRallies&&site.id==='8'?{x:580,y:315}:site.rally
    const a={at:g.time,action:'rally',site:site.id,pos:{...pos}}
    if(command(g,a)!==false){actions.push(a);rallied.add(site.id)}else if(centralRallies){rejected.push(a);rallied.add(site.id)}
   }
   if(g.waves.waitingForWave&&g.time>=(laterWave?31:10)){g.callNextWave();actions.push({at:g.time,action:'wave'})}
   actions.push(...autoPowers(g))
  }
  g.advance(1/30)
  if(tick%300===299)samples.push({at:g.time,gold:g.gold,lives:g.lives,heroes:g.heroes.team.map(h=>({name:h.name,pos:h.pos,hp:h.hp})),towers:g.towers.sites.filter(s=>s.tower).map(s=>({id:s.id,tower:s.tower}))})
 }
 return {stage:2,variant:{centralRallies,centralHeroes,videoOpening,laterWave},...result(g),actions,rejected,samples}
}
const results=[replay(2),replay(3)]
for(const options of [{},{centralRallies:true},{centralHeroes:true},{centralHeroes:true,centralRallies:true},{centralHeroes:true,centralRallies:true,videoOpening:true,laterWave:true}])results.push(candidate(options))
writeFileSync('analysis/iron-reference-replay.json',JSON.stringify({note:'Exact baseline replay must match the old trace before comparisons. Candidate rallies/hero coordinates and build times are inferred from video stills. Upper wizard holder is unresolved. Automatic spells and subsequent builds do not reproduce video inputs. No result here establishes video parity.',results},null,2))
for(const r of results)console.log(JSON.stringify({stage:r.stage,variant:r.variant,time:r.time,lives:r.lives,outcome:r.outcome,rejected:r.rejected,escapes:r.escapes}))
