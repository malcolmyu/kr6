import {assertCulverineFrame} from './assert_culverine_frame.mjs'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const level=Number(process.argv[2]??1),kind=process.argv[3]??'normal',suffix=kind==='normal'?'':`-${kind}`,read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-campaign-cleared-culverine-chain-${level}${suffix}-runtime-lcg104.json`),p=native.profileOverrides
let seed=104,calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard','culverine'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=native.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,native.playerLevel,1);applyStageSetup(g,3,'campaign',true,true)
assert.deepEqual(native.resources.missing,[]);assert.deepEqual(native.resources.missingAnimations,[])
let site,target,rayStates=0,auraStates=0,decalStates=0
for(const f of native.frames){
 if(f.tick===20){
  for(const h of g.heroes.team){h.scriptLocked=true;h.pos={x:1000,y:650}}
  g.spawnCinematicEnemy('enemy_bandit',1,{x:550,y:400});target=g.enemies.at(-1);target.hp=target.template.health.hp_max=10000;target.frozen=true;target.skillLocked=true;target.motionSpeed={x:0,y:0};target.path.pi=1;target.path.spi=1;target.path.ni=100;Object.assign(target.path.position,{x:550,y:400})
  site={id:'culverine-source',tower:`tower_culverine_lvl${level}`,pos:{x:450,y:400},terrain:1,holder:'tower_holder_terrain_1_1',spent:0};g.towers.sites.push(site);g.entities.queue(site.tower,site,'tower',site.id)
 }
 if(kind==='remove-target-before'&&f.tick===23||kind==='remove-target-after'&&f.tick===24)g.entities.remove(target)
 if(kind==='remove-source'&&f.tick===23)g.entities.remove(site)
 if(kind==='moving'&&f.tick>=100&&f.tick<250)target.path.position.x+=.5
 g.advance(1/30);const r=g.entities.registry,ctx=`culverine/${level}/${f.tick}`
 if(process.argv.includes('--dump')&&f.tick>=20&&f.tick<65)console.log(JSON.stringify({tick:f.tick,web:g.combat.culverineTowers.states.get(site?.id),native:f.entities.find(e=>e.template===site?.tower)}))
 assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const key of ['nextId','count','max'])assert.equal(r[key],f[key],ctx+'/'+key)
 assert.equal(g.gold,f.gold,ctx+'/gold');assert.equal(g.lives,f.lives,ctx+'/lives');assert.equal(g.waves.wave,f.wave,ctx+'/wave')
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 assertCulverineFrame(g,f,ctx)
 if(target){const n=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(n)assert.equal(target.hp,n.hp,ctx+'/HP');else assert(!r.entities.get(g.entities.entity(target)?.id),ctx+'/target absent')}
 if(site){const state=g.combat.culverineTowers.states.get(site.id),n=f.entities.find(e=>e.id===g.entities.entity(site)?.id);if(state&&n){assert.equal(state.attackAt,n.culverineAttackTs,ctx+'/attack clock');for(const [i,p]of state.parts.entries()){const q=n.culverineParts[i];assert.equal(p.name,q.name,ctx+'/part name '+i);assert.equal(p.ts,q.ts,ctx+'/part clock '+i);assert.equal(p.flip,q.flip_x,ctx+'/part flip '+i);assert.equal(p.hidden,!!q.hidden,ctx+'/part hidden '+i);assert.equal(p.loop,q.loop,ctx+'/part loop '+i)}}}
 for(const m of g.combat.nativeCulverine.rays){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/ray');assert.equal(m.born,n.spriteTs,ctx+'/ray clock');assert.equal(m.hidden,n.bullet.hidden,ctx+'/hidden');assert(Math.abs(m.rotation-n.rotation)<1e-12,ctx+'/rotation');for(const axis of ['x','y'])assert(Math.abs(m.scale[axis]-n.spriteScale[axis])<1e-12,ctx+'/scale');rayStates++}
 for(const m of g.combat.nativeCulverine.decals){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/decal');assert.equal(m.born,n.spriteTs,ctx+'/decal clock');assert.equal(m.alpha,n.spriteAlpha,ctx+'/decal alpha');assert.deepEqual(m.pos,n.pos,ctx+'/decal pos');decalStates++}
 for(const m of g.combat.nativeCulverine.auras){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/aura');assert.equal(m.sourceId,n.auraSource,ctx+'/source');assert.equal(m.factor,n.auraFactor,ctx+'/factor');assert.equal(m.level,n.auraLevel,ctx+'/level');assert.deepEqual(m.pos,n.pos,ctx+'/payload position');auraStates++}
}
const event=({tick,kind,id,template})=>({tick,kind,id,template});assert.deepEqual(g.entities.events.map(event),native.events.map(event))
console.log({level,kind,frames:native.frames.length,events:native.events.length,calls,rayStates,auraStates,decalStates})
