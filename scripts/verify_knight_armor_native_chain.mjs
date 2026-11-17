import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const level=Number(process.argv[2]??1),kind=process.argv[3]??'normal',suffix=kind==='normal'?'':`-${kind}`,read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-campaign-cleared-knight-armor-chain-${level}${suffix}-runtime-lcg104.json`),p=native.profileOverrides
let seed=104,calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=native.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,native.playerLevel,3);applyStageSetup(g,3,'campaign',true,true)
const commands=read(`analysis/native-runtime-knight-armor-${['upgrade','upgrade-near','sale','death-upgrade'].includes(kind)?kind:'chain'}-input.json`)
let site,auras=0
for(const f of native.frames){
 if(f.tick===20){
  for(const h of g.heroes.team){h.scriptLocked=true;Object.assign(h.pos,h.name==='hero_gerald'?{x:600,y:400}:{x:1000,y:650})}
  site={id:'armor-source',tower:'tower_knights_lvl4',pos:{x:520,y:400},rally:{x:520,y:400},terrain:1,holder:'tower_holder_terrain_1_1',spent:0,powerLevels:{skill_a:['upgrade','upgrade-near'].includes(kind)?0:level}};g.towers.sites.push(site);g.entities.queue(site.tower,site,'tower',site.id)
 }
 if([200,350,450,550,650,730].includes(f.tick))for(const h of g.heroes.team){const near=h.name==='hero_gerald'?[350,450,730].includes(f.tick):[450,550].includes(f.tick);Object.assign(h.pos,near?{x:600,y:400}:{x:1000,y:650})}
 if(f.tick===300&&(kind==='death'||kind==='death-upgrade')){const s=g.barracks.soldiers.find(s=>s.siteId===site.id&&s.slot===1);g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(s,1000,{damage_type:1})}
 for(const c of commands.filter(c=>c.tick===f.tick)){if(c.kind==='tower-power')g.upgradeTowerPower(c.holder,c.power);else if(c.kind==='sell')g.sellTower(c.holder)}
 g.advance(1/30);const r=g.entities.registry,ctx=`knight-armor/${level}/${f.tick}`
 assert.equal(r.nextId,f.nextId,ctx+'/nextId');assert.equal(calls,f.randomBoundary,ctx+'/RNG');assert.equal(g.gold,f.gold,ctx+'/gold');assert.equal(g.lives,f.lives,ctx+'/lives');assert.equal(g.waves.wave,f.wave,ctx+'/wave');for(const key of ['count','max'])assert.equal(r[key],f[key],ctx+'/'+key)
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 assert.equal(g.knightArmor.models.size,f.entities.filter(e=>e.template==='aura_knights_skill_a_check').length,ctx+'/aura collection')
 for(const m of g.knightArmor.models){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n);assert.deepEqual(m.pos,n.pos,ctx+'/aura position');assert.equal(m.sourceId,n.auraSource,ctx+'/source ID');assert.equal(m.tweenAt,n.armorTween,ctx+'/tween clock');assert.equal(m.disabled,n.armorDisabled,ctx+'/tween disabled');assert.equal(m.reverse,n.armorReverse,ctx+'/tween direction');for(const alpha of n.armorAlphas)assert.ok(Math.abs(m.alpha-alpha)<1e-8,ctx+'/alpha');auras++}
 for(const soldier of g.barracks.soldiers.filter(s=>s.siteId===site?.id)){const n=f.entities.find(e=>e.id===g.entities.entity(soldier)?.id);if(!n)continue;assert.equal(soldier.hp,n.hp,ctx+'/HP');assert.equal(soldier.template.health.armor,n.armor,ctx+'/armor');assert.equal(soldier.template.health.raw_armor,n.rawArmor,ctx+'/raw armor');assert.equal(soldier.powerLevels?.skill_a??0,n.powerA,ctx+'/power level');assert.deepEqual(soldier.pos,n.pos,ctx+'/soldier position')}
}
const event=({tick,kind,id,template})=>({tick,kind,id,template});assert.deepEqual(g.entities.events.map(event),native.events.map(event))
console.log({level,frames:native.frames.length,events:native.events.length,calls,auras})
