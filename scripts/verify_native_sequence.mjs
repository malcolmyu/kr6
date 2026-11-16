import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const mode=process.argv.includes('--constant')?'constant':'sequence',scenario=process.argv.includes('--royal-respawn')?'royal-respawn':process.argv.includes('--royal-global')?'royal-global':process.argv.includes('--royal')?'royal':process.argv.includes('--rain')?'rain':process.argv.includes('--reinforcement-lethal')?'reinforcement-lethal':process.argv.includes('--reinforcements')?'reinforcements':'',reinforcements=!!scenario
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),n=read(`analysis/level-entity-bootstrap-3-iron-entry${scenario?'-'+scenario:''}-runtime-${mode}.json`),commands=read(scenario?`analysis/native-runtime-${scenario}-input.json`:'analysis/native-runtime-smoke-input.json'),values=[.11,.83,.29,.71,.43,.59,.19,.97,.37,.61,.07,.89,.47,.53,.23,.79]
let calls=0,actors=0,units=0,idles=0,meteors=0,rainParticles=0,shadows=0,royalModels=0,royalFactors=0,royalGold=0,smokeStates={aura:0,decal:0,modifier:0},smokeCasts=0
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>{const v=mode==='constant'?.5:values[calls%values.length];calls++;return v},'iron',['archers','knights','catapult','wizard'],n.profileOverrides?.powerUpgrades??{})
g.heroes.playerLevel=n.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(n.profileOverrides?.powerXp??{},n.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const untilArg=process.argv.find(a=>a.startsWith('--until=')),until=untilArg?Number(untilArg.slice(8)):undefined
if(until!==undefined)assert(Number.isInteger(until)&&until>0&&until<n.frames.length,'prefix must be explicitly shorter than the complete trace')
const frames=until===undefined?n.frames:n.frames.filter(f=>f.tick<=until)
for(const f of frames){
 for(const c of commands.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else if(c.kind==='power'){assert(g.powers.select(c.power,g.time));assert(g.powers.cast(c.pos,g.time))}else g.build(c.holder,c.tower)
 g.advance(1/30);const ctx=`${mode} tick${f.tick}`,r=g.entities.registry
 assert.equal(g.time,f.tick*(1/30),ctx+'/clock');assert.equal(calls,f.randomBoundary,ctx+'/shared RNG count');assert.equal(r.nextId,f.nextId,ctx+'/allocator');assert.equal(r.count,f.count);assert.equal(r.max,f.max)
 assert.deepEqual([...r.entities.values()].map(({id,template})=>({id,template})),f.entities.map(({id,template})=>({id,template})),ctx+'/actual Lua table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/pending inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/pending removals')
 assert.equal(g.gold,f.gold,ctx+'/gold');assert.equal(g.lives,f.lives,ctx+'/lives');assert.equal(g.waves.wave,f.wave);assert.equal(g.paused,f.paused??false);assert.equal(g.outcome?.kind,f.outcome?(f.outcome.victory?'victory':'defeat'):undefined)
 const live=g.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined&&!g.entities.entity(e)?.pending_removal),original=f.entities.filter(e=>e.template.startsWith('enemy_')&&e.hp>0&&!f.removals.includes(e.id));assert.equal(live.length,original.length)
 for(const e of live){const a=f.entities.find(a=>a.id===g.entities.entity(e)?.id);assert(a,ctx+'/enemy registration');assert.equal(e.hp,a.hp,ctx+'/enemy HP');assert.equal(e.path.ni,a.node.ni);assert(Math.hypot(e.path.position.x-a.pos.x,e.path.position.y-a.pos.y)<1e-7);actors++}
 const registeredSoldiers=g.barracks.soldiers.map(s=>g.entities.entity(s)).filter(e=>e&&r.entities.get(e.id)).map(e=>e.id).sort((a,b)=>a-b),nativeSoldiers=f.entities.filter(e=>e.template.startsWith('soldier_')||e.template==='hero_gerald'||e.template==='hero_zefira').map(e=>e.id).sort((a,b)=>a-b)
 assert.deepEqual(registeredSoldiers,nativeSoldiers,ctx+'/actual soldier collection membership')
 for(const s of g.barracks.soldiers){const entity=g.entities.entity(s),a=entity&&f.entities.find(a=>a.id===entity.id);if(!a)continue;assert.equal(s.hp,a.hp,ctx+'/soldier HP');assert(Math.hypot(s.pos.x-a.pos.x,s.pos.y-a.pos.y)<1e-7,ctx+'/soldier position');assert.equal(s.target?g.entities.entity(s.target)?.id:undefined,a.target,ctx+'/soldier target');units++
  if(s.name==='soldier_reinforcement_base'){assert.equal(s.infoKey,a.soldierInfo);assert(Math.abs(s.corpseAlpha-a.spriteAlpha)<1e-8,ctx+'/reinforcement native alpha')}
  const idle=g.barracks.idleStates.get(s)?.state;if(idle){assert.equal(idle.ts,a.idleState.ts,ctx+`/${s.name}#${entity.id}/idle last call`);assert.equal(idle.ts_counter,a.idleState.counter,ctx+'/idle accumulated clock');assert.equal(idle.last_animation,a.idleState.animation);assert.equal(s.facingLeft,a.flipX,ctx+`/${s.name}#${entity.id}/native facing`);idles++}
 }
 if(scenario==='royal-global'){
  const near=(a,b,label)=>assert(Math.abs(a-b)<1e-7,ctx+'/'+label+': '+a+' != '+b)
  for(const {model:m}of g.entities.bindingsInOrder('smoke')){const a=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(a);smokeStates[m.kind]++;near(m.pos.x,a.pos.x,'smoke x');near(m.pos.y,a.pos.y,'smoke y')
   if(m.kind==='aura'){assert.equal(m.born,a.auraTs);assert.equal(m.duration,a.auraDuration)}
   else if(m.kind==='decal'){assert.equal(m.animationAt,a.spriteTs);near(m.alpha,a.spriteAlpha,'smoke alpha')}
   else{assert.equal(m.ts,a.modifierTs);assert.equal(g.entities.entity(m.enemy)?.id,a.modifierTarget);assert.equal(m.spriteTs,a.spriteTs);assert.equal(m.facingLeft,a.spriteFlip);near(m.offset.x,a.spriteOffset.x,'smoke modifier offset x');near(m.offset.y,a.spriteOffset.y,'smoke modifier offset y')}
  }
  for(const e of g.enemies)if(g.enemySkills.casting.has(e.id)){const a=f.entities.find(a=>a.id===g.entities.entity(e)?.id);assert.equal(e.visualOverride.name,a.animation,ctx+'/smokebomb animation');assert.equal(e.visualOverride.at,a.spriteTs);near(e.motionSpeed.x,a.motion.x,'caster speed x');near(e.motionSpeed.y,a.motion.y,'caster speed y');smokeCasts++}
 }
 if(scenario.startsWith('royal')){
  const near=(a,b,label)=>assert(Math.abs(a-b)<1e-7,ctx+'/'+label+': '+a+' != '+b)
  for(const binding of g.entities.bindingsInOrder('royal')){const m=binding.model,a=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(a);royalModels++
   if(m.kind==='gold'){assert.equal(g.entities.entity(m.enemy)?.id,a.modifierTarget,ctx+'/gold modifier target');assert.equal(m.duration,a.modifierDuration,ctx+'/gold modifier remaining duration');assert.equal(m.at,a.modifierTs,ctx+'/gold modifier clock');royalGold++}
   if(m.kind==='actor'||m.kind==='buff'){near(m.pos.x,a.pos.x,'royal x');near(m.pos.y,a.pos.y,'royal y');assert.equal(m.name,a.animation,ctx+'/royal animation');assert.equal(m.ts,a.spriteTs,ctx+'/royal sprite clock');assert.equal(m.loop,a.spriteLoop);near(m.alpha,a.spriteAlpha,'royal alpha');if(m.kind==='buff')assert.equal(m.modifierTs,a.modifierTs,ctx+'/royal modifier clock')}
  }
  for(const site of g.towers.sites){if(!site.tower)continue;const e=g.entities.entity(site),a=f.entities.find(a=>a.id===e?.id);if(a?.towerFactor!==undefined){assert.equal(site.damageFactor??1,a.towerFactor,ctx+'/actual tower damage factor');royalFactors++}}
 }
 if(scenario==='rain'){
  const near=(a,b,label)=>assert(Math.abs(a-b)<1e-7,ctx+'/'+label+': '+a+' != '+b),point=(a,b,label)=>{near(a.x,b.x,label+' x');near(a.y,b.y,label+' y')}
  const nativeMeteors=f.entities.filter(e=>e.template==='bullet_power_rain_of_fire');assert.equal(g.powers.meteors.length,nativeMeteors.length,ctx+'/meteor bodies')
  for(const m of g.powers.meteors){const a=nativeMeteors.find(a=>a.id===g.entities.entity(m)?.id);assert(a);point(m.pos,a.pos,'meteor position');point(m.to,a.bullet.to,'meteor aim');near(m.rotation,a.rotation,'meteor rotation');meteors++;const shadow=m.shadow&&g.entities.entity(m.shadow),original=f.entities.find(e=>e.id===shadow?.id);if(original){point(m.to,original.pos,'shadow position');near(m.shadowScale,original.spriteScale.x,'shadow scale');shadows++}}
  assert.equal(g.powers.rainTrails.trails.length,f.entities.filter(e=>e.template==='ps_power_rain_of_fire').length,ctx+'/rain particle bodies')
  for(const t of g.powers.rainTrails.trails){const a=f.entities.find(a=>a.id===g.entities.entity(t)?.id);assert(a,ctx+'/actual particle binding');assert.equal(t.at,a.particles.at);assert.equal(t.emit,a.particles.emit);near(t.emitTs,a.particles.emitTs,'emitter clock');assert.equal(t.particles.length,a.particles.particles.length,ctx+'/particle count')
   for(let i=0;i<t.particles.length;i++){const p=t.particles[i],q=a.particles.particles[i];near(p.at,q.at,'particle clock');near(p.lifetime,q.lifetime,'particle lifetime');point(p.pos,q.pos,'particle position');near(p.rotation,q.rotation,'particle rotation');near(p.alpha,q.alpha,'particle alpha');point(p.scale,q.scale,'particle scale');assert.equal(p.frame,q.frame);assert.equal(p.drawOrder,q.drawOrder);rainParticles++}
  }
 }

}
const event=e=>({tick:e.tick,kind:e.kind,id:e.id,template:e.template});assert.deepEqual(g.entities.events.map(event),n.events.slice(0,frames.at(-1).eventBoundary).map(event));if(until===undefined){if(!['royal-global','royal-respawn'].includes(scenario))assert.equal(n.frames.length,1391);assert.equal(g.outcome.kind,'defeat')}else assert.equal(g.outcome,undefined,'bounded prefix does not prove a completed outcome')
if(scenario==='royal-global'&&until===undefined){assert(Object.values(smokeStates).every(n=>n>0)&&smokeCasts>0,'whole profile must exercise actual smoke aura/decal/modifier');console.log({smokeStates,smokeCasts})}
if(scenario==='royal-respawn'&&until===undefined){const retired=n.events.filter(e=>e.tick===1200&&e.kind==='remove'&&e.template.startsWith('soldier_knights')),born=n.events.filter(e=>e.tick>1200&&e.kind==='create'&&e.template.startsWith('soldier_knights'));assert(retired.length>0&&born.length>=retired.length,'respawn must actually retire corpses and create replacements');console.log({retired:retired.map(e=>e.id),replacements:born.map(e=>({id:e.id,tick:e.tick}))})}
if(scenario.startsWith('royal')){assert(royalModels>0&&royalFactors>0);console.log({royalModels,royalFactors,royalGold})}
if(scenario==='rain'){assert(meteors>0&&shadows>0&&rainParticles>0,'rain fixture must exercise trajectories/shadows/particles');console.log({meteors,shadows,rainParticles})}
console.log(`Actual ${mode}${scenario?' '+scenario:''} GameSession: ${until===undefined?'all':'PREFIX ONLY '}${frames.length} ticks/${g.entities.events.length} entity events/${calls} draws, ${actors} enemy states, ${units} soldier/hero states and ${idles} idle clocks/facings match original. ${until===undefined?'One prescribed defeat fixture':'Incomplete prefix; later frames remain unverified'}, not full3-2/video acceptance.`)
