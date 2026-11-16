import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const repair=process.argv.includes('--repair-input'),rescheduled=[]
const read=p=>JSON.parse(readFileSync(p)),p=read('analysis/native-runtime-video-observed-profile.json'),commands=read(repair?'analysis/native-runtime-video-continued-input.json':'analysis/native-runtime-video-observed-input.json'),templates=read('public/data/entities.json')
let seed=104
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),templates,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'iron',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=4;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,4,3);applyStageSetup(g,3,'iron',true,true)
function perform(c){if(c.kind==='send_wave')g.callNextWave();else if(c.kind==='hero-rally'){g.heroes.selectedId=g.heroes.team.find(h=>h.name===c.name).id;assert(g.heroes.moveSelected(c.pos))}else if(c.kind==='rally')assert(g.setRally(c.holder,c.pos));else if(c.kind==='power'){assert(g.powers.select(c.power,g.time));assert(g.powers.cast(c.pos,g.time))}else if(c.kind==='upgrade')g.upgradeTower(c.holder);else g.build(c.holder,c.tower)}
const visible=p=>p.x>=-512/3&&p.x<=1024+512/3&&p.y>=0&&p.y<=768,escapes=[]
for(let tick=1;tick<=30000&&!g.outcome;tick++){
 for(const c of commands.filter(c=>c.tick===tick)){if(repair&&(c.kind==='build'||c.kind==='upgrade')){const price=c.kind==='build'?g.towers.price(c.tower):g.towers.nextUpgrade(g.towers.sites.find(s=>s.id===c.holder))?.price;assert(price!==undefined);if(g.gold<price){rescheduled.push({from:tick,holder:c.holder,gold:g.gold,price});c.tick++;continue}}perform(c)}
 if(!repair&&tick>3151&&tick%10===2&&!g.cinematic){
  const add=c=>{const command={tick,...c};perform(command);commands.push(command)}
  const empty=g.towers.sites.find(s=>!s.tower&&!s.building&&s.canBeModified!==false)
  if(empty){const kind=['1','2','3'].includes(empty.id)?'wizard':'catapult';if(g.gold>=g.towers.price(kind))add({kind:'build',holder:empty.id,tower:kind})}
  else {const candidate=g.towers.sites.map(s=>({site:s,next:g.towers.nextUpgrade(s)})).filter(a=>a.next&&a.next.price<=g.gold).sort((a,b)=>templates[a.site.tower].tower.level-templates[b.site.tower].tower.level)[0];if(candidate)add({kind:'upgrade',holder:candidate.site.id,tower:candidate.next.name})}
  const enemies=g.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined).sort((a,b)=>a.path.remainingNodes-b.path.remainingNodes),first=enemies[0]
  if(first&&visible(first.path.position)){
   const h=g.heroes.team.find(h=>h.name===(first.path.position.y>550?'hero_zefira':'hero_gerald')&&h.hp>0)
   if(h&&!h.scriptLocked&&g.time-(h.probeGuardAt??-100)>5&&Math.hypot(h.pos.x-first.path.position.x,h.pos.y-first.path.position.y)>65){add({kind:'hero-rally',name:h.name,pos:{...first.path.position}});h.probeGuardAt=g.time}
   if(g.powers.remaining('reinforcements',g.time)<=0&&!(first.template.vis.flags&128))add({kind:'power',power:'reinforcements',pos:{...first.path.position}})
   const heavy=enemies.find(e=>e.name==='enemy_blackguard'&&visible(e.path.position));if(heavy&&g.powers.remaining('rain_of_fire',g.time)<=0){const pos=heavy.path.predict(heavy.template.motion.max_speed*.8);if(visible(pos))add({kind:'power',power:'rain_of_fire',pos})}
   if(enemies.length>=4&&g.powers.remaining('royal_edict',g.time)<=0){const sites=g.towers.sites.filter(s=>s.tower),pos=sites.map(s=>s.pos).sort((a,b)=>sites.filter(s=>Math.hypot(s.pos.x-b.x,(s.pos.y-b.y)/.7)<200).length-sites.filter(s=>Math.hypot(s.pos.x-a.x,(s.pos.y-a.y)/.7)<200).length)[0];if(pos)add({kind:'power',power:'royal_edict',pos:{...pos}})}
  }
 }
 g.advance(1/30)
 for(const e of g.enemies)if(e.escapedAt!==undefined&&!escapes.some(x=>x.id===e.id))escapes.push({id:e.id,name:e.name,hp:e.hp,at:e.escapedAt,pos:{...e.path.position}})
}
writeFileSync('analysis/native-runtime-video-continued-input.json',JSON.stringify(commands,null,2)+'\n');writeFileSync('analysis/native-runtime-video-continued-profile.json',JSON.stringify(p,null,2)+'\n');writeFileSync('analysis/native-runtime-video-continued-web.json',JSON.stringify({note:'First17 observed/inferred commands, then explicit ordinary strategy commands; not later video actions.',rescheduled,tick:g.tick,outcome:g.outcome,gold:g.gold,lives:g.lives,commands:commands.length,escapes},null,2)+'\n');console.log({rescheduled,tick:g.tick,outcome:g.outcome,gold:g.gold,lives:g.lives,commands:commands.length,escapes})
