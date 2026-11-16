import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const level=Number(process.argv[2]??1),kind=process.argv[3]??'normal',read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-iron-cleared-mark-chain-${level}-${kind}-runtime-lcg104.json`),p=native.profileOverrides
let seed=104,calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'iron',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=native.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
let target,states=0
for(const f of native.frames){
 if(f.tick===20){g.spawnCinematicEnemy('enemy_bandit',1,{x:620,y:462});target=g.enemies.at(-1);target.hp=target.template.health.hp_max=10000;target.template.unit.mod_offset={x:7,y:13};target.frozen=true;target.skillLocked=true;target.motionSpeed={x:0,y:0};target.path.pi=1;target.path.spi=1;target.path.ni=100;Object.assign(target.path.position,{x:620,y:462});if(kind==='boss')target.template.vis.flags|=32;g.archerMark.queue(target,level)}
 if(f.tick===80&&kind==='refresh')g.archerMark.queue(target,level)
 g.advance(1/30);const r=g.entities.registry,ctx=`mark/${level}/${kind}/${f.tick}`
 assert.equal(r.nextId,f.nextId,ctx+'/nextId');assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const key of ['count','max'])assert.equal(r[key],f[key],ctx+'/'+key)
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 if(target){const n=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(n)assert.equal(target.template.health.damage_factor,n.damageFactor,ctx+'/damage factor')}
 for(const m of g.archerMark.marks){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/registered mark');assert.equal(m.animation,n.animation,ctx+'/animation');assert.equal(m.spriteAt,n.spriteTs,ctx+'/sprite clock');assert.equal(m.at,n.modifierTs,ctx+'/duration clock');assert.equal(m.duration,n.modifierDuration,ctx+'/duration');assert.equal(m.loop,n.spriteLoop,ctx+'/loop');assert.deepEqual(m.pos,n.pos,ctx+'/pos');assert.deepEqual(m.offset,n.spriteOffset,ctx+'/offset');states++}
}
const event=({tick,kind,id,template})=>({tick,kind,id,template});assert.deepEqual(g.entities.events.map(event),native.events.map(event));assert(states>0);assert.equal(g.archerMark.marks.length,0);assert.equal(target.template.health.damage_factor,1)
console.log({level,kind,frames:native.frames.length,events:native.events.length,calls,states})
