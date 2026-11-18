import {driveBolinChain} from './bolin_chain_inputs.mjs'
import {driveBolinMortarChain} from './bolin_a_chain_inputs.mjs'
import {driveBolinMinesChain} from './bolin_b_chain_inputs.mjs'
import assert from 'node:assert/strict'
import {readPreciseJson as read} from './read_precise_json.mjs'
import {heroUpgradeData,validateHeroUpgrades} from '../src/game/HeroUpgrades.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const n=read(process.argv[2]??'analysis/level-entity-bootstrap-3-campaign-cleared-bolin-base-runtime-lcg104.json'),p=n.profileOverrides
assert.deepEqual(validateHeroUpgrades(heroUpgradeData,'hero_bolin',Math.max(1000,p.heroXp.hero_bolin??0),p.heroUpgrades.hero_bolin??[]),p.heroUpgrades.hero_bolin??[],'fixture uses legal saved Bolin purchases')
const mode=process.argv[3]??'normal',scenario=process.argv[4]??'bolin-base'
// Native libm and V8 atan2 differ by one float64 ULP for e.g. (-43,140).
// GPU-visible angles allow four ULPs; clocks, positions, damage and RNG stay exact.
const angleEqual=(actual,expected,context)=>{if(actual===expected)return;const ulp=Number.EPSILON*2**Math.floor(Math.log2(Math.abs(expected)));assert(expected!==0&&Math.abs(actual-expected)<=4*ulp,`${context}: ${actual} != ${expected}`)}
let seed=104,calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard'],{},{}),sounds=[]
g.onSound=(name,options)=>sounds.push({tick:g.tick,name,...(options?.delay!==undefined?{delay:options.delay}:{})});g.heroes.selectedTeam=['hero_bolin','hero_zefira'];g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=n.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},n.playerLevel,1);applyStageSetup(g,3,'campaign',true,true)
if(mode==='death')assert(n.events.some(e=>e.kind==='create'&&e.template==='controller_bolin_death_explosion'),'original death controller coverage')
else if(/^bolin-b(?:-|$)/.test(scenario))assert.equal(n.events.some(e=>e.kind==='create'&&e.template==='bullet_bolin_skill_b'),!['wave0','nearby'].includes(mode),'actual original mine-placement coverage')
else assert.equal(n.events.some(e=>e.kind==='create'&&e.template.startsWith('bullet_bolin')),!['no-target','remove-before','few','flying'].includes(mode),'actual original firing/no-target coverage')
for(const f of n.frames){
 if(scenario.startsWith('bolin-a'))driveBolinMortarChain(g,f.tick,mode);else if(/^bolin-b(?:-|$)/.test(scenario))driveBolinMinesChain(g,f.tick,mode);else driveBolinChain(g,f.tick,mode,p.isolateBolinSkills)
 g.advance(1/30);const r=g.entities.registry,ctx=`actual Bolin/${f.tick}`
 if(r.nextId!==f.nextId)console.error(JSON.stringify({tick:f.tick,actualEvents:g.entities.events.filter(e=>e.tick>=f.tick-1),originalEvents:n.events.filter(e=>e.tick>=f.tick-1&&e.tick<=f.tick),heroes:g.heroes.team.map(h=>({name:h.name,hp:h.hp,xp:h.xp,queued:h.xpQueued}))}))
 assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const k of ['nextId','count','max'])assert.equal(r[k],f[k],ctx+'/'+k)
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/full entity table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/insert queue');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/remove queue')
 for(const original of f.entities){
  const b=[...g.entities.bindingsInOrder()].find(b=>g.entities.entity(b.model)?.id===original.id),m=b?.model
  if(original.template==='hero_bolin'){
   const c=g.heroes.bolin.states.get(m),idle=!m.visualOverride&&!m.meleeVisual&&!m.attack&&!m.moving?m.idleVisual:undefined,pose=m.visualOverride??m.meleeVisual??idle??{name:m.moving?'walk':'idle',at:m.born,loop:true}
   assert.equal(m.regenCounter,original.bolinRegen,ctx+'/regen counter');assert.equal(c.ts,original.bolinRangedTs,ctx+'/attack timestamp');assert.equal(pose.name,original.animation,ctx+'/hero animation');assert.equal(pose.at,original.spriteTs,ctx+'/hero animation clock');assert.equal(pose.loop??false,original.spriteLoop,ctx+'/hero loop');assert.equal(m.facingLeft,original.spriteFlip,ctx+'/hero flip');assert.deepEqual(m.pos,original.pos,ctx+'/hero position')
  }
  if(b?.kind==='particle'&&['bolinCasing','bolinMortar'].includes(m.kind)){
   const p=original.particles;assert(p,ctx+'/original casing particle state');for(const [key,value]of [['sourceId',p.source],['at',p.at],['emit',p.emit],['emitTs',p.emitTs]])assert.equal(m[key],value,ctx+'/emitter '+key)
   assert.deepEqual(m.particles.map(p=>({at:p.at,lifetime:p.lifetime,pos:p.pos,rotation:p.rotation,frame:p.frame,alpha:p.alpha,scale:p.scale,drawOrder:p.drawOrder})),p.particles,ctx+'/all actual particle fields')
  }
  if(original.template==='hero_bolin'&&original.bolinTimedTs)assert.equal(g.heroes.bolin.mortar.timestamps.get(m)??0,original.bolinTimedTs[0],ctx+'/mortar timestamp')
  if(b?.kind==='enemy')assert.deepEqual(m.path.position,original.pos,ctx+'/actual enemy position')
  if(b?.kind==='enemy'&&original.bolinMaxSpeed!==undefined)assert.equal(m.template.motion.max_speed,original.bolinMaxSpeed,ctx+'/actual enemy max speed')
  if(original.template==='hero_bolin'&&original.bolinTimedTs)assert.equal(g.heroes.bolin.mines.timestamps.get(m)??0,original.bolinTimedTs[1],ctx+'/mine timestamp')
  if(original.template==='hero_bolin'&&original.bolinMinesNear!==undefined)assert.equal(g.heroes.bolin.mines.maxNear.get(m)??false,original.bolinMinesNear,ctx+'/nearby mine capacity latch')
  if(b?.kind==='bolinMines'){
   assert.deepEqual(m.pos,original.pos,ctx+'/'+m.name+' position');assert.equal(m.rotation,original.rotation,ctx+'/mine rotation');assert.equal(m.z,original.bolinSprite.z,ctx+'/mine Z');assert.equal(m.spriteAt,original.spriteTs,ctx+'/mine sprite clock');assert.equal(m.animation,original.animation,ctx+'/mine animation');assert.equal(m.loop,original.spriteLoop,ctx+'/mine loop')
   if(m.kind==='bullet'){assert.deepEqual(m.from,original.bullet.from,ctx+'/mine from');assert.deepEqual(m.to,original.bullet.to,ctx+'/mine to');assert.deepEqual(m.speed,original.bullet.speed,ctx+'/mine velocity')}
   else{assert.equal(m.sourceId,original.bolinSource,ctx+'/mine owner');if(original.bolinTrigger!==undefined)assert.equal(m.trigger,original.bolinTrigger,ctx+'/forced trigger');if(original.bolinAuraLevel!==undefined)assert.equal(m.level,original.bolinAuraLevel,ctx+'/mine level')}
  }
  if(b?.kind==='bolinMortar'){
   assert.deepEqual(m.pos,original.pos,ctx+'/'+m.name+' position')
   if(m.kind==='bullet')assert.equal(m.sourceId,n.events.find(e=>e.kind==='create'&&e.id===original.id).owner,ctx+'/mortar creating hero')
   if(m.kind==='area')assert.equal(m.sourceId,original.bolinSource,ctx+'/mortar area source')
   if(m.kind==='slow'){assert.equal(m.sourceId,original.modifierSource,ctx+'/slow source');assert.equal(m.targetId,original.modifierTarget,ctx+'/slow target')}
   if(m.kind==='bullet'){assert.deepEqual(m.speed,original.bullet.speed,ctx+'/mortar velocity');assert.deepEqual(m.from,original.bullet.from,ctx+'/mortar from');assert.deepEqual(m.to,original.bullet.to,ctx+'/mortar to');assert.equal(m.rotation,original.rotation,ctx+'/mortar rotation');assert.equal(m.z,original.bolinSprite.z,ctx+'/mortar Z');assert.equal(m.spriteAt,original.spriteTs,ctx+'/mortar sprite clock')}
   if(m.kind==='area')assert.equal(m.at,original.auraTs,ctx+'/aura clock')
   if(m.kind==='slow')assert.equal(m.at,original.modifierTs,ctx+'/slow clock')
   if(['smoke','crater'].includes(m.kind)){assert.equal(m.alpha,original.spriteAlpha,ctx+'/visual alpha');assert.equal(m.spriteAt,original.spriteTs,ctx+'/visual clock');assert.equal(m.animation,original.animation,ctx+'/visual animation');assert.equal(m.tweenAt,original.bolinTween.ts,ctx+'/tween clock');assert.equal(m.tweenDisabled,original.bolinTween.disabled,ctx+'/tween disabled')}
  }
  if(b?.kind==='bolinNative'){
   assert.deepEqual(m.pos,original.pos,ctx+'/'+m.name+' position')
   if(m.kind==='casing'){for(const [key,value]of [['rotation',original.rotation],['z',original.bolinSprite.z],['spriteAt',original.spriteTs],['animation',original.animation],['alpha',original.spriteAlpha],['yOrigin',original.bolinYOrigin]])assert.equal(m[key],value,ctx+'/casing '+key);assert.equal(m.fadeAt===undefined,original.bolinTween.disabled,ctx+'/casing tween disabled');if(m.fadeAt!==undefined)assert.equal(m.fadeAt,original.bolinTween.ts,ctx+'/casing tween clock')}
   if(m.kind==='hit'){assert.equal(m.at,original.spriteTs,ctx+'/hit clock');angleEqual(m.rotation,original.rotation,ctx+'/hit rotation')}
   if(m.kind==='bullet'){assert.deepEqual(m.to,original.bullet.to,ctx+'/bullet endpoint');assert.deepEqual(m.from,original.bullet.from,ctx+'/bullet origin');if(m.name==='bullet_bolin_skill_c'){angleEqual(m.ray?.rotation??0,original.rotation,ctx+'/ray rotation');assert.equal(m.ray?.at??0,original.spriteTs,ctx+'/ray clock');assert.deepEqual(m.ray?.scale,original.spriteScale,ctx+'/ray scale');assert.equal(m.ray?.hidden??false,original.bullet.hidden??false,ctx+'/ray hidden')}}
   if(m.kind==='controller')assert.equal(m.sourceId,original.bolinSource,ctx+'/controller source')
  }
 }
 for(const b of g.entities.bindingsInOrder())if(b.kind==='enemy'||b.kind==='hero'){const original=f.entities.find(e=>e.id===g.entities.entity(b.model).id),h=b.model;if(!original)continue;assert.equal(h.hp,original.hp,ctx+'/HP');if(b.kind==='hero'){assert.equal(h.xp,original.hero.xp,ctx+'/XP');assert.equal(h.xpQueued,original.hero.xpQueued,ctx+'/queued XP');assert.equal(h.level,original.hero.level,ctx+'/level')}}
}
const project=({tick,id,kind,template})=>({tick,id,kind,template});assert.deepEqual(g.entities.events.map(project),n.events.map(project));assert.deepEqual(sounds.filter(s=>s.name!=='GUINextWaveIncoming'),read(`analysis/native-${scenario}-sounds.json`).filter(s=>s.name));console.log(`${n.frames.length} complete actual GameSession Bolin base frames / ${n.events.length} entity events / ${calls} RNG calls match original`)
