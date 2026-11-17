import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const level=Number(process.argv[2]??1),kind=process.argv[3]??'normal',suffix=kind==='normal'?'':`-${kind}`,read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-campaign-cleared-empower-chain-${level}${suffix}-runtime-lcg104.json`),p=native.profileOverrides
let seed=104,calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=native.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,native.playerLevel,3);applyStageSetup(g,3,'campaign',true,true)
const commands=read(`analysis/native-runtime-empower-chain${['source-sale','source-windup','target-upgrade','target-windup','target-sale','target-rebuild'].includes(kind)?'-'+kind:''}-input.json`)
let target,site,wizard,second,states=0
for(const f of native.frames){
 if(f.tick===20){
  g.spawnCinematicEnemy('enemy_bandit',1,{x:760,y:412});target=g.enemies.at(-1);target.template.vis.bans=-1;target.hp=target.template.health.hp_max=10000;target.frozen=true;target.skillLocked=true;target.motionSpeed={x:0,y:0};target.path.pi=1;target.path.spi=1;target.path.ni=100;Object.assign(target.path.position,{x:760,y:412})
  site={id:'probe',tower:'tower_wizard_lvl4',pos:{x:520,y:400},rally:{x:520,y:400},terrain:1,holder:'tower_holder_terrain_1_1',spent:0,powerLevels:{skill_b:level}};if(kind==='preview'){site.powerLevels.skill_b=0;site.powerPreview='skill_b'}g.towers.sites.push(site);g.entities.queue(site.tower,site,'tower','probe')
  wizard={id:'empower-target',tower:'tower_wizard_lvl1',pos:{x:650,y:400},rally:{x:650,y:400},holder:'tower_holder_terrain_1_1',terrain:1,spent:0,attackDisabled:true};g.towers.sites.push(wizard);g.entities.queue(wizard.tower,wizard,'tower',wizard.id)
 }
 if(f.tick===20&&['equal','stronger','stronger-late'].includes(kind)){second={...site,id:'second',pos:{x:560,y:400},powerLevels:{skill_b:kind==='stronger'?3:kind==='equal'?1:0}};g.towers.sites.push(second);g.entities.queue(second.tower,second,'tower',second.id)}
 if(f.tick===100&&kind==='stronger-late')second.powerLevels.skill_b=1
 if(f.tick===105&&kind==='stronger-late')second.powerLevels.skill_b=3
 if(f.tick===40&&(kind==='preview'||kind==='rank-up')){site.powerPreview=undefined;site.powerLevels.skill_b=kind==='preview'?1:3}
 for(const c of commands.filter(c=>c.tick===f.tick)){if(c.kind==='sell')g.sellTower(c.holder);else if(c.kind==='build')g.build(c.holder,c.tower);else if(c.kind==='upgrade')g.upgradeTower(c.holder)}
 g.advance(1/30);const r=g.entities.registry,ctx=`empower/${level}/${f.tick}`
 assert.equal(r.nextId,f.nextId,ctx+'/nextId');assert.equal(calls,f.randomBoundary,ctx+'/RNG');assert.equal(g.gold,f.gold,ctx+'/gold');assert.equal(g.lives,f.lives,ctx+'/lives');assert.equal(g.waves.wave,f.wave,ctx+'/wave');for(const key of ['count','max'])assert.equal(r[key],f[key],ctx+'/'+key)
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 if(target){const n=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(n){assert.equal(target.hp,n.hp,ctx+'/targetHP');assert.equal(target.template.unit.stun_count??0,n.stunCount??0,ctx+'/stun count')}}
 for(const m of g.wizardEmpower.runtime.models){
  const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/registered empower');assert.deepEqual(m.pos,n.pos,ctx+'/position')
  if(m.kind==='buff'||m.kind==='fx'){assert.equal(m.at,n.modifierTs,ctx+'/modifier clock');assert.equal(m.targetId,n.modifierTarget,ctx+'/target ID');assert.equal(m.sourceId,n.modifierSource,ctx+'/source ID');assert.equal(m.duration,n.modifierDuration,ctx+'/duration')}
  if(m.kind!=='buff'){assert.equal(m.spriteAt,n.spriteTs,ctx+'/sprite clock');assert.equal(m.tweenAt,n.empowerTween,ctx+'/tween clock');assert.equal(m.disabled,n.empowerDisabled,ctx+'/disabled');assert.equal(m.reverse,n.empowerReverse,ctx+'/reverse');assert.ok(Math.abs(m.alpha-n.spriteAlpha)<1e-8,ctx+'/alpha')}
  states++
 }
 for(const t of [site,wizard,second].filter(Boolean)){const n=f.entities.find(e=>e.id===g.entities.entity(t)?.id);if(n&&n.template===t.tower)assert.equal(t.damageFactor??1,n.towerFactor,ctx+'/damage factor '+t.id)}
 for(const caster of [site,second].filter(Boolean)){const n=f.entities.find(e=>e.id===g.entities.entity(caster)?.id),state=g.combat.wizardTowers.states.get(caster.id);if(n?.wizardParts&&state){assert.equal(state.buffTs,n.wizardBuffTs,ctx+'/buff clock');for(const [i,p]of state.parts.entries()){const s=n.wizardParts[i];assert.equal(p.name,s.name,ctx+'/part name'+i);assert.equal(p.ts,s.ts,ctx+'/part clock'+i);assert.equal(p.loop,s.loop,ctx+'/part loop'+i);assert.equal(p.flip,s.flip_x,ctx+'/part flip'+i);for(const axis of ['x','y'])assert.ok(Math.abs(p.offset[axis]-s.offset[axis])<1e-12,ctx+'/part offset'+i+'/'+axis)}}}
}
const event=({tick,kind,id,template})=>({tick,kind,id,template});assert.deepEqual(g.entities.events.map(event),native.events.map(event))
console.log({level,frames:native.frames.length,events:native.events.length,calls,states})
