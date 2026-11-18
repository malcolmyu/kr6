import {driveCatapultChain} from './catapult_chain_inputs.mjs'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),n=read(process.argv[2]??'analysis/level-entity-bootstrap-3-campaign-cleared-catapult-native-area-a-runtime-lcg104.json'),p=n.profileOverrides
const rank=Number(process.argv[3]??1),mode=process.argv[4]??'normal',skill=process.argv[5]??'skill_a'
const payload={skill_a:'aura_catapult_skill_a',skill_b:'aura_catapult_skill_b_bomb',skill_c:'aura_catapult_skill_c_trap'}[skill];assert(n.events.some(e=>e.kind==='create'&&e.template===payload),'native fixture must actually exercise selected power')
if(mode==='aligned')assert(n.events.some(e=>e.kind==='insert'&&e.template==='mod_catapult_skill_a_slow'),'aligned fixture must apply real registered slow')
if(mode.startsWith('trigger')&&!['trigger-leave','trigger-remove','trigger-stun-banned','trigger-boss'].includes(mode))assert(n.events.some(e=>e.kind==='insert'&&e.template==='mod_catapult_skill_c_stun'),'trigger fixture must actually apply original stun')
if(['trigger-stun-banned','trigger-boss'].includes(mode)){assert(n.events.some(e=>e.kind==='create'&&e.template==='mod_catapult_skill_c_stun'));assert(!n.events.some(e=>e.kind==='insert'&&e.template==='mod_catapult_skill_c_stun'))}
if(mode==='capacity')assert.equal(Math.max(...n.frames.flatMap(f=>f.entities.filter(e=>e.template==='tower_catapult_lvl4').map(e=>e.catapultActive.length))),3,'native fixture reaches actual rank1 cap')
let seed=104,calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard','culverine'],p.powerUpgrades??{},p.globalUpgrades)
const sounds=[];g.onSound=name=>sounds.push({tick:g.tick,name})
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=n.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,n.playerLevel,1);applyStageSetup(g,3,'campaign',true,true)
for(const f of n.frames){
 driveCatapultChain(g,f.tick,rank,mode,skill)
 g.advance(1/30);const r=g.entities.registry,ctx=`native catapult ${skill}/${f.tick}`
 if(process.argv.includes('--inspect')&&f.tick>=220&&f.tick<=240)console.log(JSON.stringify({tick:f.tick,web:g.entities.events.filter(e=>e.tick>=f.tick-1),native:n.events.filter(e=>e.tick>=f.tick-1&&e.tick<=f.tick)}))
 if(process.argv.includes('--inspect-late')&&f.tick>=755)console.log(JSON.stringify({tick:f.tick,web:g.entities.events.filter(e=>e.tick===f.tick),native:n.events.filter(e=>e.tick===f.tick),shots:g.combat.projectiles.map(p=>({id:g.entities.entity(p)?.id,name:p.name,to:p.to,pos:p.pos})),enemy:g.enemies.map(e=>({id:g.entities.entity(e)?.id,pos:e.path.position,hp:e.hp}))}))
 assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const k of ['nextId','count','max'])assert.equal(r[k],f[k],ctx+'/'+k)
 for(const native of f.entities){
  const binding=[...g.entities.bindingsInOrder()].find(b=>g.entities.entity(b.model)?.id===native.id),m=binding?.model
  if(native.template==='aura_catapult_skill_a'){
   assert(m&&binding.kind==='catapultTar',ctx+'/real area binding')
   for(const [key,expected]of [['at',native.auraTs],['duration',native.auraDuration],['spriteAt',native.spriteTs],['alpha',native.spriteAlpha]])assert.equal(m[key],expected,ctx+'/area '+key)
   assert.deepEqual(m.pos,native.pos,ctx+'/area position');assert.equal(m.level,native.auraLevel,ctx+'/area rank')
   assert.equal(m.fadeAt===undefined,native.tarTween.disabled,ctx+'/area tween disabled');if(m.fadeAt!==undefined)assert.equal(m.fadeAt,native.tarTween.ts,ctx+'/area tween timestamp')
  }else if(native.template==='aura_catapult_skill_b_bomb'){
   assert(m&&binding.kind==='catapultBomb',ctx+'/real bomb binding')
   for(const [key,expected]of [['name',native.animation],['spriteAt',native.spriteTs],['loop',native.spriteLoop],['level',native.auraLevel]])assert.equal(m[key],expected,ctx+'/bomb '+key)
   assert.deepEqual(m.pos,native.pos,ctx+'/bomb position')
  }else if(native.template==='aura_catapult_skill_c_trap'){
   assert(m&&binding.kind==='catapultTrap',ctx+'/real trap binding')
   for(const [key,expected]of [['at',native.auraTs],['spriteAt',native.spriteTs],['name',native.animation],['loop',native.spriteLoop],['level',native.auraLevel],['sourceId',native.catapultSource],['hidden',native.catapultHidden]])assert.equal(m[key],expected,ctx+'/trap '+key)
   assert.deepEqual(m.pos,native.pos,ctx+'/trap position')
  }else if(native.template==='mod_catapult_skill_c_stun'){
   assert(m&&binding.kind==='catapultTrapStun',ctx+'/real stun binding')
   for(const [key,expected]of [['ts',native.modifierTs],['duration',native.modifierDuration],['sourceId',native.modifierSource],['targetId',native.modifierTarget],['spriteTs',native.spriteTs],['name',native.animation],['level',native.catapultLevel],['flip',native.spriteFlip]])assert.equal(m[key],expected,ctx+'/stun '+key)
   assert.deepEqual(m.pos,native.pos,ctx+'/stun position');assert.deepEqual(m.offset,native.spriteOffset,ctx+'/stun offset')
  }else if(native.template==='mod_catapult_skill_a_slow'){
   assert(m&&binding.kind==='catapultTar',ctx+'/real slow binding')
   for(const [key,expected]of [['at',native.modifierTs],['targetId',native.modifierTarget],['sourceId',native.modifierSource],['factor',native.tarSlow]])assert.equal(m[key],expected,ctx+'/slow '+key)
   assert.deepEqual(m.pos,native.pos,ctx+'/slow position')
  }else if(binding?.kind==='tower'&&skill==='skill_c'&&native.template==='tower_catapult_lvl4'){assert.deepEqual((g.combat.nativeTraps.active.get(native.id)??[]).map(t=>t.id),native.catapultActive,ctx+'/actual active_traps')}else if(binding?.kind==='enemy'){if(skill==='skill_c'){assert.equal(m.template.unit.stun_count,native.stunCount,ctx+'/actual stun count');assert.equal(!!m.template.unit.is_stunned,native.stunned,ctx+'/actual stunned')}assert.equal(m.template.motion.max_speed,native.tarSpeed,ctx+'/actual speed');assert.equal(m.hp,native.hp,ctx+'/actual HP')}
 }
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/insert queue');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/remove queue')
}
if(process.argv.includes('--sounds')){const expected=read(`analysis/native-${process.argv[6]}-sounds.json`).filter(s=>s.name);assert(expected.length>0);assert.deepEqual(sounds.filter(s=>s.name!=='GUINextWaveIncoming'&&s.name!=='GUIStageDefeat'),expected,'all original named engine sound requests');console.log(`${expected.length} original named sound requests match`)}
const project=({tick,id,kind,template})=>({tick,id,kind,template});assert.deepEqual(g.entities.events.map(project),n.events.map(project));console.log(`Complete native catapult ${skill} rank${rank}/${mode}: ${n.frames.length} registry/main/area/slow/tween and HP/speed frames match`)
