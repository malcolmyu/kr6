import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {soldierIsDead} from '../src/game/SoldierHealth.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const level=Number(process.argv[2]??1),kind=process.argv[3]??'normal',suffix=kind==='normal'?'':`-${kind}`,read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-campaign-cleared-knight-heal-chain-${level}${suffix}-runtime-lcg104.json`),p=native.profileOverrides
let seed=104,calls=0,heals=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
const sounds=[];g.onSound=name=>sounds.push({tick:g.tick,name})
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=native.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,native.playerLevel,3);applyStageSetup(g,3,'campaign',true,true)
let site,target,controlled=false;const interrupted=new WeakSet()
for(const f of native.frames){
 if(f.tick===20){
  for(const h of g.heroes.team){h.scriptLocked=true;h.pos={x:1000,y:650}}
  g.spawnCinematicEnemy('enemy_bandit',1,{x:550,y:400});target=g.enemies.at(-1);target.hp=target.template.health.hp_max=10000;target.frozen=true;target.skillLocked=true;target.motionSpeed={x:0,y:0};target.path.pi=1;target.path.spi=1;target.path.ni=100;Object.assign(target.path.position,{x:550,y:400})
  site={id:'heal-source',tower:'tower_knights_lvl4',pos:{x:520,y:400},rally:{x:520,y:400},terrain:1,holder:'tower_holder_terrain_1_1',spent:0,powerLevels:{skill_b:kind==='initial'?level:0}};g.towers.sites.push(site);g.entities.queue(site.tower,site,'tower',site.id)
 }
 if(kind!=='initial'&&(f.tick===80||f.tick===120&&level>=2||f.tick===160&&level>=3)){site.powerLevels.skill_b++;(site.powerChanges??=new Set()).add('skill_b')}
 if(kind==='idle'&&target)target.template.vis.bans=-1
 if(['death-before','death-between'].includes(kind)&&site){const s=g.barracks.soldiers.find(s=>s.siteId===site.id&&s.slot===1);if(s&&!interrupted.has(s)&&s.visualOverride?.name==='heal'&&g.time-s.visualOverride.at>=(kind==='death-before'?.1:.35)){interrupted.add(s);g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(s,1000,{damage_type:1})}}
 if(['stun-before','stun-between','upgrade-cast'].includes(kind)&&site){const s=g.barracks.soldiers.find(s=>s.siteId===site.id&&s.slot===1);if(s&&!controlled&&s.visualOverride?.name==='heal'&&g.time-s.visualOverride.at>=(kind==='stun-between'?.35:.1)){controlled=true;if(kind==='stun-before'||kind==='stun-between'){s.template.unit.is_stunned=true;s.template.unit.stun_count=1}else{site.powerLevels.skill_b=3;(site.powerChanges??=new Set()).add('skill_b')}}}
 if(f.tick===300&&['stun-before','stun-between'].includes(kind)){const s=g.barracks.soldiers.find(s=>s.siteId===site.id&&s.slot===1);s.template.unit.is_stunned=false;s.template.unit.stun_count=0}
 if(f.tick===215&&kind==='rally-before'||f.tick===225&&kind==='rally-between')g.barracks.setRally(site,{x:510,y:400},g.time)
 if(f.tick===200||f.tick===700)for(const s of g.barracks.soldiers.filter(s=>s.siteId===site.id).sort((a,b)=>a.slot-b.slot)){g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(s,60,{damage_type:1})}
 g.advance(1/30);const r=g.entities.registry,ctx=`knight-heal/${level}/${kind}/${f.tick}`
 if(process.argv.includes('--dump')&&f.tick>=213&&f.tick<=218)console.log(JSON.stringify({tick:f.tick,time:g.time,controlled,ss:g.barracks.soldiers.filter(s=>s.siteId===site.id).map(s=>({id:g.entities.entity(s)?.id,visual:s.visualOverride,stun:s.template.unit?.is_stunned,state:g.knightHeal.state(s)}))}))
 assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const key of ['nextId','count','max'])assert.equal(r[key],f[key],ctx+'/'+key)
 assert.equal(g.gold,f.gold,ctx+'/gold');assert.equal(g.lives,f.lives,ctx+'/lives');assert.equal(g.waves.wave,f.wave,ctx+'/wave')
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 for(const s of g.barracks.soldiers.filter(s=>s.siteId===site?.id)){const n=f.entities.find(e=>e.id===g.entities.entity(s)?.id);if(!n){const id=g.entities.entity(s)?.id;assert(f.inserts.includes(id)&&r.pendingInserts.some(e=>e.id===id),ctx+'/unregistered soldier');continue}assert.equal(soldierIsDead(s),n.healthDead,ctx+'/native health.dead');assert.equal(!!s.healthBarHidden,n.barHidden,ctx+'/native health bar hidden');assert.equal(s.powerLevels?.skill_b??0,n.powerB,ctx+'/power rank');assert.equal(s.hp,n.hp,ctx+'/'+n.id+'/HP');for(const axis of ['x','y'])assert(Math.abs(s.pos[axis]-n.pos[axis])<1e-7,ctx+'/position')
  {const state=g.knightHeal.state(s);assert.equal(state.disabled,n.healConfig.disabled,ctx+'/disabled');assert.equal(state.ts,n.healConfig.ts,ctx+'/cooldown clock');assert.equal(state.hpFraction,n.healConfig.hp_ptg,ctx+'/heal fraction')}
  if(n.animation==='heal'){assert.equal(s.visualOverride?.name,'heal',ctx+'/animation');assert.equal(s.visualOverride.at,n.spriteTs,ctx+'/animation clock');heals++}
 }
 if(target){const n=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(n)assert.equal(target.hp,n.hp,ctx+'/target HP')}
}
const event=({tick,kind,id,template})=>({tick,kind,id,template});assert.deepEqual(g.entities.events.map(event),native.events.map(event))
assert.deepEqual(sounds,native.healSounds.filter(s=>s.name).map(({tick,name})=>({tick,name})), 'Original sound requests')
console.log({level,kind,sounds:sounds.length,frames:native.frames.length,events:native.events.length,calls,heals})
