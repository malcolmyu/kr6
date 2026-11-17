import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const level=Number(process.argv[2]??1),kind=process.argv[3]??'normal',suffix=kind==='normal'?'':`-${kind}`,read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-campaign-cleared-pierce-chain-${level}${suffix}-runtime-lcg104.json`),p=native.profileOverrides
let seed=104,calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'campaign',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=native.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,native.playerLevel,3);applyStageSetup(g,3,'campaign',true,true)
let target,site,rays=0,stuns=0
for(const f of native.frames){
 if(f.tick===20){
  g.spawnCinematicEnemy('enemy_bandit',1,{x:620,y:462});target=g.enemies.at(-1);target.hp=target.template.health.hp_max=10000;target.frozen=true;target.skillLocked=true;target.motionSpeed={x:0,y:0};target.path.pi=1;target.path.spi=1;target.path.ni=100;Object.assign(target.path.position,{x:620,y:462})
  site={id:'probe',tower:'tower_archers_lvl4',pos:{x:520,y:400},rally:{x:520,y:400},terrain:1,holder:'tower_holder_terrain_1_1',spent:0,powerLevels:{skill_a:kind==='a-in-c'?0:['upgrade','sale','release','same','c-in-a'].includes(kind)?1:level,...(['same','a-in-c'].includes(kind)?{skill_c:1}:{})}};g.towers.sites.push(site);g.entities.queue(site.tower,site,'tower','probe')
 }
 if(f.tick===30&&(kind==='upgrade'||kind==='sale'))site.powerLevels.skill_a=level
 if(f.tick===63&&kind==='release')site.powerLevels.skill_a=level
 if(f.tick===31&&kind==='c-in-a')site.powerLevels.skill_c=1
 if(f.tick===31&&kind==='a-in-c')site.powerLevels.skill_a=1
 if(f.tick===70&&kind==='sale')g.entities.remove(site)
 if(f.tick===100&&kind==='combined')site.powerLevels.skill_c=1
 g.advance(1/30);const r=g.entities.registry,ctx=`pierce/${level}/${f.tick}`
 assert.equal(r.nextId,f.nextId,ctx+'/nextId');assert.equal(calls,f.randomBoundary,ctx+'/RNG');for(const key of ['count','max'])assert.equal(r[key],f[key],ctx+'/'+key)
 assert.deepEqual([...r.entities.values()].map(e=>[e.id,e.template]),f.entities.map(e=>[e.id,e.template]),ctx+'/table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts,ctx+'/inserts');assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals,ctx+'/removals')
 if(target){const n=f.entities.find(e=>e.id===g.entities.entity(target)?.id);if(n){assert.equal(target.hp,n.hp,ctx+'/targetHP');assert.equal(target.template.unit.stun_count??0,n.stunCount??0,ctx+'/stun count')}}
 for(const m of g.archerPierceStun.stuns){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/registered stun');assert.equal(m.ts,n.modifierTs);assert.equal(m.spriteTs,n.spriteTs);assert.equal(m.name,n.animation);assert.deepEqual(m.pos,n.pos);assert.deepEqual(m.offset,n.spriteOffset);stuns++}
 for(const m of g.combat.archerPierceRays.rays){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/registered ray');assert.equal(m.hidden,n.bullet.hidden);assert.equal(m.born,n.spriteTs);assert.ok(Math.abs(m.rotation-n.rotation)<1e-12);assert.deepEqual(m.scale,n.spriteScale);rays++}
 if(site){const n=f.entities.find(e=>e.id===g.entities.entity(site)?.id),state=g.combat.shooters.get(site.id);if(n&&state)for(const [index,sid]of g.templates[site.tower].shooters_sids.entries()){const c=state.archers.get(sid),s=n.archerParts[sid-1];assert.equal(c.animation+(c.back&&c.animation!=='stun'?'back':''),s.name,ctx+'/shooter'+index);assert.equal(c.startedAt,s.ts,ctx+'/clock'+index);assert.equal(c.flipX,s.flip,ctx+'/flip'+index);assert.equal(c.loop,s.loop,ctx+'/loop'+index)}}
}
const event=({tick,kind,id,template})=>({tick,kind,id,template});assert.deepEqual(g.entities.events.map(event),native.events.map(event));assert(rays>0&&stuns>0)
console.log({level,frames:native.frames.length,events:native.events.length,calls,rays,stuns})
