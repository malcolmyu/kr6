import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
import {nativeAnimationFrame} from '../src/game/NativeAnimation.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),commands=read('analysis/native-runtime-smoke-input.json'),g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const hits=[],starts=[],effects=[],owners=[],attack=g.barracks.soldierAttack.bind(g.barracks),resolve=g.barracks.resolveDamage.bind(g.barracks),effect=g.barracks.onEffect,spawns=native.events.filter(e=>e.kind==='create'&&e.template.startsWith('enemy_'))
const main=g.entities.mainBindings.bind(g.entities);let active
 g.entities.mainBindings=function*(){for(const binding of main()){active=binding;yield binding;active=undefined}}
g.barracks.soldierAttack=(s,e,time)=>{const previous=s.attack;attack(s,e,time);if(s.name==='hero_zefira'&&s.attack&&!previous)starts.push({tick:Math.round(time*30),target:e.id,at:s.attack.startedAt})}
g.barracks.resolveDamage=(time,enemies)=>{const pending=g.barracks.knightDamage.filter(h=>h.soldier.name==='hero_zefira').map(h=>({hit:h,before:h.enemy.hp}));resolve(time,enemies);for(const {hit,before}of pending)hits.push({tick:Math.round(time*30),target:hit.enemy.id,value:before-hit.enemy.hp,packet:hit.packet.value})}
g.barracks.onEffect=(name,pos,time)=>{if(name==='fx_zefira_hit'){effects.push({tick:Math.round(time*30),pos:{...pos}});owners.push(active?.model?.name)}effect(name,pos,time)}
let samples=0,fxStates=0
const fxDefinition=read('public/data/towers-art.json').exos.hero_zefira_attack2_hitDef,fxFrames=fxDefinition.animations.find(a=>a.name==='action').frames.length
for(const f of native.frames.slice(0,1390)){
 for(const c of commands.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
 g.advance(1/30)
 const models=g.nativeEffects.filter(m=>m.name==='fx_zefira_hit'),active=models.filter(m=>g.entities.registry.entities.get(g.entities.entity(m)?.id)),expectedFx=f.entities.filter(e=>e.template==='fx_zefira_hit')
 assert.equal(active.length,expectedFx.length,`tick${f.tick}/registered melee-FX count`)
 for(const m of active){const entity=g.entities.entity(m),n=expectedFx.find(e=>e.id===entity.id);assert(n);assert.deepEqual(m.pos,n.pos);assert.equal(m.at,n.spriteTs);const frame=nativeAnimationFrame(fxFrames,g.time-m.at,false,fxDefinition.fps).frame+1;assert.equal(frame,n.meleeFx.frame,`tick${f.tick}/native hit-FX animation frame`);assert.equal(g.entities.registry.pendingRemovals.includes(entity),f.removals.includes(entity.id));fxStates++}
 if(f.tick<1308)continue
 const h=g.heroes.zefira,n=f.entities.find(e=>e.template==='hero_zefira'),context=`actual native hero melee tick${f.tick}`
 assert.equal(h.xp,n.hero.xp,context+'/hero XP')
 assert(Math.hypot(h.pos.x-n.pos.x,h.pos.y-n.pos.y)<1e-8,context+'/position')
 assert.equal(h.meleeVisual?.name??(h.moving?'walk':'idle'),n.animation,context+'/retained render animation')
 if(h.attack){assert.equal(n.animation,'attack_2',context+'/native animation');assert.equal(h.attack.startedAt,n.spriteTs,context+'/cast start');assert.equal(h.target?.id,spawns.findIndex(e=>e.id===n.target)+1,context+'/retained target')}
 else assert.equal(h.attack,undefined,context+'/not attacking')
 samples++
}
assert.deepEqual(starts,[1316,1351,1386].map(tick=>({tick,target:18,at:tick*(1/30)})))
const nativeHero=native.events.find(e=>e.kind==='create'&&e.template==='hero_zefira').id
assert.deepEqual(hits,native.damageTrace.filter(e=>e.source===nativeHero&&e.tick<=1390).map(e=>({tick:e.tick,target:spawns.findIndex(s=>s.id===e.target)+1,value:e.applied,packet:e.value})))
assert.equal(hits[0].tick,1331);assert.equal(hits[0].value,8)
assert.deepEqual(owners,['hero_zefira','hero_zefira'],'hit effects must be created by the hero own main, before health')
const fx=native.events.filter(e=>e.kind==='queueInsert'&&e.template==='fx_zefira_hit')
assert.deepEqual(effects,fx.map(e=>({tick:e.tick,pos:native.frames[e.tick].entities.find(n=>n.id===e.id).pos})))
console.log(`Actual GameSession Zefira own-main approach/three casts match ${samples} native position/cast/target states through1390, deferred damage8 at1331/1367 and ${fxStates} registered hit-FX states with native frames/positions/queue/removal clocks; full hero skills and global health interleaving remain outside this gate`)
