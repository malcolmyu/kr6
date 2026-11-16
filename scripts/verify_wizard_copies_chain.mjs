import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const level=Number(process.argv[2]??1),kind=process.argv[3]??'follow',lcg=process.argv.includes('--lcg'),read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-iron-cleared-copies-chain-${level}-${kind}-runtime-${lcg?'lcg104':'constant'}.json`),p=native.profileOverrides
let seed=104,currentTick=0,calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>{calls++;if(lcg){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}return .5},'iron',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=native.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
let target,models=0;const sounds=[];g.onSound=name=>sounds.push({tick:g.tick,name})
const near=(a,b,ctx)=>assert(Math.abs(a-b)<1e-7,`${ctx}: ${a} != ${b}`)
for(const f of native.frames){
 if(f.tick===20){
  if(kind==='missing'){g.entities.allocate('enemy_bandit');g.combat.wizardTowers.onCopies({id:'source'},'bullet_skill_c_wizard_1',{x:500,y:450},{x:620,y:462},-1,level,50,50,g.time)}else{
  g.spawnCinematicEnemy('enemy_bandit',1,{x:620,y:462});target=g.enemies.at(-1);target.hp=target.template.health.hp_max=10000;target.template.unit.hit_offset={x:0,y:0};target.frozen=true;target.skillLocked=true;target.motionSpeed={x:0,y:0};target.path.pi=1;target.path.spi=1;target.path.ni=100;Object.assign(target.path.position,{x:620,y:462})
  g.combat.wizardTowers.onCopies({id:'source'},'bullet_skill_c_wizard_1',{x:500,y:450},{x:620,y:462},target.id,level,50,50,g.time)
  }
 }
 if(f.tick>=40&&target){const aura=g.wizardCopies.auras.find(a=>a.inserted&&!a.removed);if(kind==='empty')Object.assign(target.path.position,{x:10000,y:10000});else if(aura)Object.assign(target.path.position,{x:aura.pos.x+20,y:aura.pos.y})}
 currentTick=f.tick;g.advance(1/30);const ctx=`copies-chain/${level}/${kind}/${f.tick}`,r=g.entities.registry
 if(process.argv.includes('--dump')&&f.tick>=20)writeFileSync('analysis/wizard-copies-chain-dump.json',JSON.stringify({tick:f.tick,webEvents:g.entities.events.filter(e=>e.tick===f.tick),nativeEvents:native.events.filter(e=>e.tick===f.tick),projectiles:g.combat.projectiles.map(e=>({id:g.entities.entity(e)?.id,name:e.name,pos:e.pos,to:e.to,done:e.done,hidden:e.hidden,at:e.born})),auras:g.wizardCopies.auras,expected:f.entities.filter(e=>e.template==='aura_wizard_skill_c'||e.template.startsWith('bullet_skill_c'))},null,2))
 assert.equal(r.nextId,f.nextId,ctx+'/nextId');assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const key of ['count','max'])assert.equal(r[key],f[key],ctx+'/'+key)
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 if(target){const a=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(a)assert.equal(target.hp,a.hp,ctx+'/target health')}
 for(const m of g.wizardCopies.auras){const e=g.entities.entity(m),a=f.entities.find(a=>a.id===e.id);if(!a)continue;assert.equal(m.animation,a.animation,ctx+'/book animation');assert.equal(m.at,a.spriteTs,ctx+'/book clock');near(m.alpha,a.spriteAlpha,ctx+'/book alpha');near(m.pos.x,a.pos.x,ctx+'/book x');near(m.pos.y,a.pos.y,ctx+'/book y');models++}
 for(const m of g.combat.projectiles){const a=f.entities.find(a=>a.id===g.entities.entity(m)?.id);if(!a)continue;near(m.pos.x,a.pos.x,ctx+'/'+m.name+'/x');near(m.pos.y,a.pos.y,ctx+'/'+m.name+'/y')}
}
const event=({tick,kind,id,template})=>({tick,kind,id,template});assert.deepEqual(g.entities.events.map(event),native.events.map(event));if(kind==='missing'){assert.equal(models,0);assert(!sounds.some(s=>s.name==='TowerScholarMageSpareCopiesBolts'));assert(!native.copiesSounds.some(s=>s.name==='TowerScholarMageSpareCopiesBolts'))}else assert(models>0);assert.equal(g.wizardCopies.auras.length,0)
console.log({level,kind,random:lcg?'lcg104':'constant',frames:native.frames.length,events:native.events.length,calls,models,hp:target?.hp})
