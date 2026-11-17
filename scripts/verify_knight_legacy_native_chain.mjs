import {assertReinforcementSpecialFrame} from './assert_reinforcement_special_frame.mjs'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {soldierIsDead} from '../src/game/SoldierHealth.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const level=Number(process.argv[2]??1),kind=process.argv[3]??'normal',suffix=kind==='normal'?'':`-${kind}`,read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-campaign-cleared-knight-legacy-chain-${level}${suffix}-runtime-lcg104.json`),p=native.profileOverrides
let seed=104,calls=0,boosted=0,stunStates=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
const sounds=[];g.onSound=name=>sounds.push({tick:g.tick,name})
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=native.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,native.playerLevel,1);applyStageSetup(g,3,'campaign',true,true)
const commands=read(`analysis/native-runtime-knight-legacy-${kind==='sale'?'sale':kind==='reinforcement-repeat-special'?'reinforcement-repeat':kind.startsWith('reinforcement')?'reinforcement':'empty'}-input.json`)
let site,target
for(const f of native.frames){
 if(f.tick===20){
  for(const h of g.heroes.team){h.scriptLocked=true;h.pos={x:1000,y:650}}
  g.spawnCinematicEnemy('enemy_bandit',1,{x:550,y:400});target=g.enemies.at(-1);target.hp=target.template.health.hp_max=10000;target.frozen=true;target.skillLocked=true;target.motionSpeed={x:0,y:0};target.path.pi=1;target.path.spi=1;target.path.ni=100;Object.assign(target.path.position,{x:550,y:400})
  site={id:'legacy-source',tower:'tower_knights_lvl4',pos:{x:520,y:400},rally:{x:520,y:400},terrain:1,holder:'tower_holder_terrain_1_1',spent:0,powerLevels:{skill_c:['purchase','late'].includes(kind)?0:level}};g.towers.sites.push(site);g.entities.queue(site.tower,site,'tower',site.id)
 }
 if(kind==='purchase'&&(f.tick===80||f.tick===120&&level>=2||f.tick===160&&level>=3)){site.powerLevels.skill_c++;(site.powerChanges??=new Set()).add('skill_c')}
 if(f.tick===300&&kind==='late'){site.powerLevels.skill_c=level;(site.powerChanges??=new Set()).add('skill_c')}
 if(f.tick===200&&['boundary-in','boundary-out'].includes(kind)){const s=g.barracks.soldiers.find(s=>s.siteId===site.id&&s.slot===1),c=g.barracks.soldiers.find(s=>s.siteId===site.id&&s.slot===2);s.pos.x=c.pos.x+100+(kind==='boundary-out'?.000000001:0);s.pos.y=c.pos.y}
 if((f.tick===200||f.tick===500)&&!kind.startsWith('reinforcement')&&site.tower==='tower_knights_lvl4'){const soldier=g.barracks.soldiers.find(s=>s.siteId===site.id&&s.slot===(f.tick===200?1:2));assert(soldier,'Native injected damage requires a retained roster slot');g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(soldier,1000,{damage_type:1})}
 if(f.tick===200&&['reinforcement-death','reinforcement-death-special'].includes(kind)||f.tick===90&&kind==='reinforcement-early-death-special')for(const {model:s}of g.entities.bindingsInOrder('soldier'))if(s.expiresAt!==undefined){g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(s,10000,{damage_type:1})}
 for(const c of commands.filter(c=>c.tick===f.tick)){if(c.kind==='sell')g.sellTower(c.holder);else if(c.kind==='power')g.powers.onQueueReinforcement({pos:{...c.pos}})}
 g.advance(1/30);const r=g.entities.registry,ctx=`knight-legacy/${level}/${kind}/${f.tick}`
 if(process.argv.includes('--dump')&&f.tick>=213&&f.tick<=218)console.log(JSON.stringify({tick:f.tick,time:g.time,controlled,ss:g.barracks.soldiers.filter(s=>s.siteId===site.id).map(s=>({id:g.entities.entity(s)?.id,visual:s.visualOverride,stun:s.template.unit?.is_stunned,state:g.knightHeal.state(s)}))}))
 if(process.argv.includes('--special-dump')&&f.tick>=490&&f.tick<=493)console.log(JSON.stringify({tick:f.tick,web:g.barracks.soldiers.map(s=>({id:g.entities.entity(s)?.id,name:s.name,pos:s.pos,fade:s.fadeOutAt,speed:s.template.motion.max_speed,hp:s.hp})),native:f.entities.filter(e=>e.template.startsWith('soldier_')).map(e=>({id:e.id,name:e.template,pos:e.pos,hp:e.hp}))}))
 assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const key of ['nextId','count','max'])assert.equal(r[key],f[key],ctx+'/'+key)
 assert.equal(g.gold,f.gold,ctx+'/gold');assert.equal(g.lives,f.lives,ctx+'/lives');assert.equal(g.waves.wave,f.wave,ctx+'/wave')
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 for(const s of g.barracks.soldiers.filter(s=>s.siteId===site?.id)){const n=f.entities.find(e=>e.id===g.entities.entity(s)?.id);if(!n){const id=g.entities.entity(s)?.id;assert(f.inserts.includes(id)&&r.pendingInserts.some(e=>e.id===id),ctx+'/unregistered soldier');continue}assert.equal(soldierIsDead(s),n.healthDead,ctx+'/native health.dead');assert.equal(!!s.healthBarHidden,n.barHidden,ctx+'/native health bar hidden');assert.equal(s.powerLevels?.skill_c??0,n.powerC,ctx+'/power rank');assert.equal(s.hp,n.hp,ctx+'/'+n.id+'/HP');for(const axis of ['x','y'])assert(Math.abs(s.pos[axis]-n.pos[axis])<1e-7,ctx+'/position')
  assert.equal(s.deathFinishedAt,n.deathFinished,ctx+'/death finish')
  for(const [i,attack]of s.template.melee.attacks.entries()){const expected=n.legacyAttacks[i];assert.equal(attack.disabled,expected.disabled,ctx+'/attack disabled '+i);assert.equal(attack.cooldown,expected.cooldown,ctx+'/attack cooldown '+i);assert.equal(attack.mod,expected.mod,ctx+'/attack modifier '+i)}
  if(n.animation==='attack_2'){assert.equal(s.visualOverride?.name,'attack_2',ctx+'/boost animation');assert.equal(s.visualOverride.at,n.spriteTs,ctx+'/boost clock');boosted++}

 }
 if(target){const n=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(n)assert.equal(target.hp,n.hp,ctx+'/target HP')}
 for(const soldier of g.barracks.soldiers.filter(s=>s.expiresAt!==undefined)){const n=f.entities.find(e=>e.id===g.entities.entity(soldier)?.id);if(n){assert.equal(soldier.hpBeforeTimeout,n.hpBeforeTimeout,ctx+'/natural retirement marker');assert.equal(soldier.deathFinishedAt,n.deathFinished,ctx+'/reinforcement death finish')}}
 if(kind.endsWith('-special'))assertReinforcementSpecialFrame(g,f,ctx)

 const models=g.knightLegacy?.models??new Set();assert.equal(models.size,f.entities.filter(e=>e.template==='aura_knights_skill_c_check').length,ctx+'/aura collection')
 for(const m of models){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n);assert.equal(m.sourceId,n.auraSource,ctx+'/aura source');assert.equal(m.sourceId,n.auraTarget,ctx+'/aura target');for(const axis of ['x','y'])assert(Math.abs(m.pos[axis]-n.pos[axis])<1e-7,ctx+'/aura position')}
 for(const m of g.knightLegacy?.stuns.stuns??[]){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n);assert.equal(m.ts,n.modifierTs,ctx+'/stun clock');assert.equal(m.spriteTs,n.spriteTs,ctx+'/stun sprite clock');assert.equal(m.level,n.modifierLevel,ctx+'/stun rank');assert.equal(m.sourceId,n.modifierSource,ctx+'/stun source');assert.equal(m.targetId,n.modifierTarget,ctx+'/stun target');assert.equal(m.name,n.animation,ctx+'/stun animation');assert.equal(m.flip,n.spriteFlip,ctx+'/stun flip');assert.deepEqual(m.offset,n.spriteOffset,ctx+'/stun offset');stunStates++}
 const ns=f.entities.filter(e=>e.template.startsWith('mod_knights_skill_c_stun'));assert.equal(g.knightLegacy?.stuns.stuns.length??0,ns.length,ctx+'/stun collection')
 if(target){const n=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(n){assert.equal(target.template.unit.stun_count??0,n.stunCount,ctx+'/stun count');assert.equal(!!target.template.unit.is_stunned,n.stunned,ctx+'/stun ownership')}}

}
const event=({tick,kind,id,template})=>({tick,kind,id,template});assert.deepEqual(g.entities.events.map(event),native.events.map(event))
assert.deepEqual(sounds,native.legacySounds.filter(s=>s.name).map(({tick,name})=>({tick,name})), 'Original sound requests')
console.log({level,kind,sounds:sounds.length,frames:native.frames.length,events:native.events.length,calls,boosted,stunStates})
