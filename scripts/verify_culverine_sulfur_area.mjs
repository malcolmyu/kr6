import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const rank=Number(process.argv[2]??1),kind=process.argv[3]??'normal',read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),n=read(`analysis/level-entity-bootstrap-3-campaign-cleared-sulfur-area-${rank}-${kind}-runtime-lcg104.json`),p=n.profileOverrides
let seed=104,calls=0,modStates=0,areaStates=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=n.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,n.playerLevel,1);applyStageSetup(g,3,'campaign',true,true)
let target,area
for(const f of n.frames){
 if(f.tick===20){for(const h of g.heroes.team){h.scriptLocked=true;h.pos={x:1000,y:650}}g.spawnCinematicEnemy('enemy_bandit',1,{x:550,y:400});target=g.enemies.at(-1);target.hp=target.template.health.hp_max=10000;target.template.health.magic_armor=.4;target.frozen=true;target.skillLocked=true;target.motionSpeed={x:0,y:0};target.path.pi=1;target.path.spi=1;target.path.ni=100;Object.assign(target.path.position,{x:550,y:400});area=g.sulfur.queueArea(`aura_bullet_culverine_skill_a_lvl${rank}`,{x:550,y:400},0)}
 if(f.tick===40&&['duplicate','mixed','higher-level'].includes(kind))g.sulfur.queueArea(`aura_bullet_culverine_skill_a_lvl${kind==='mixed'?3:rank}`,{x:550,y:400},kind==='higher-level'?1:0)
 if(f.tick===80){if(kind==='dead'){target.diedAt=g.time}else if(kind==='remove')g.entities.remove(target);else if(kind==='no-magic')target.template.enemy.can_accept_magic=false;else if(kind==='exit')target.path.position.x=800;else if(kind==='banned')target.template.vis.bans=4}
 if(f.tick===100&&kind==='remove-area')g.entities.remove(area)
 g.advance(1/30);const r=g.entities.registry,ctx=`sulfur/${rank}/${kind}/${f.tick}`
 assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const k of ['nextId','count','max'])assert.equal(r[k],f[k],ctx+'/'+k)
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 assert.equal(g.sulfur.areas.size,f.entities.filter(e=>e.template.startsWith('aura_bullet_culverine_skill_a')).length,ctx+'/area count');assert.equal(g.sulfur.modifiers.size,f.entities.filter(e=>e.template.startsWith('mod_bullet_culverine_skill_a')).length,ctx+'/modifier count')
 for(const m of [...g.sulfur.areas,...g.sulfur.modifiers]){const a=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(a,ctx+'/registered model');if(m.kind==='area'){assert.equal(m.at,a.auraTs,ctx+'/area clock');assert.equal(m.duration,a.sulfurDuration,ctx+'/duration');assert.equal(m.level,a.auraLevel,ctx+'/area level');areaStates++}else{assert.equal(m.at,a.modifierTs,ctx+'/modifier clock');assert.equal(m.lost,a.sulfurLost,ctx+'/lost magic armor');assert.equal(m.sourceId,a.modifierSource,ctx+'/source');assert.equal(m.targetId,a.modifierTarget,ctx+'/target');assert.deepEqual(m.pos,a.pos,ctx+'/position alias');modStates++}}
 if(target){const a=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(a){assert.equal(target.template.health.magic_armor,a.magicArmor,ctx+'/magic armor');assert.equal(target.template.health.raw_magic_armor,a.rawMagicArmor,ctx+'/raw magic armor')}}
}
const project=({tick,id,kind,template})=>({tick,id,kind,template});assert.deepEqual(g.entities.events.map(project),n.events.map(project));assert(modStates>0);assert(areaStates>0);console.log({rank,kind,frames:n.frames.length,events:g.entities.events.length,calls,modStates,areaStates})
