import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),commands=read('analysis/native-runtime-smoke-input.json'),g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const r=g.heroes.ranged,queues=[],removes=[],damages=[],serials=new WeakMap(),queue=r.onQueueProjectile,remove=r.onRemoveProjectile,resolve=r.resolveHits.bind(r),enemies=native.events.filter(e=>e.kind==='create'&&e.template.startsWith('enemy_')),originalQueues=native.events.filter(e=>e.kind==='queueInsert'&&e.template==='bullet_zefira'),ids=originalQueues.map(e=>e.id)
r.onQueueProjectile=(p,time)=>{serials.set(p,queues.length);queues.push({tick:Math.round(time*30),target:p.target.id,from:{...p.pos},to:{...p.to}});queue(p,time)}
r.onRemoveProjectile=p=>{removes.push({tick:Math.round(g.time*30),serial:serials.get(p)});remove(p)}
r.resolveHits=time=>{const pending=r.hits.map(h=>({p:h.p,value:h.value,before:h.p.target.hp}));resolve(time);for(const h of pending)damages.push({tick:Math.round(time*30),serial:serials.get(h.p),target:h.p.target.id,value:h.value,applied:h.before-h.p.target.hp})}
let samples=0
for(const f of native.frames.slice(0,1288)){
 for(const c of commands.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
 g.advance(1/30)
 const original=f.entities.filter(e=>e.template==='bullet_zefira'),context=`native hero ranged tick${f.tick}`
 assert.equal(r.projectiles.length,original.length,context+'/active projectile count')
 for(const p of r.projectiles){const n=original.find(e=>e.id===ids[serials.get(p)]);assert(n,context+'/projectile identity');assert.equal(p.target.id,enemies.findIndex(e=>e.id===n.bullet.target)+1,context+'/target');for(const key of ['pos','to']){const b=key==='pos'?n.pos:n.bullet.to;assert(Math.hypot(p[key].x-b.x,p[key].y-b.y)<1e-8,context+'/'+key)}assert(Math.abs(p.rotation-n.rotation)<1e-8,context+'/rotation');samples++}
 const h=g.heroes.zefira,n=f.entities.find(e=>e.template==='hero_zefira');assert.equal(h.xp,n.hero.xp,context+'/hero xp');assert.equal(h.level,n.hero.level,context+'/hero level')
}
assert.equal(queues.length,2)
for(let i=0;i<queues.length;i++){const actual=queues[i],n=originalQueues[i];assert.deepEqual(actual,{tick:n.tick,target:enemies.findIndex(e=>e.id===n.target)+1,from:n.from,to:n.to})}
assert.deepEqual(removes,native.events.filter(e=>e.kind==='queueRemove'&&e.template==='bullet_zefira').map(e=>({tick:e.tick,serial:ids.indexOf(e.id)})))
assert.deepEqual(damages,native.damageTrace.filter(d=>ids.includes(d.source)).map(d=>({tick:d.tick,serial:ids.indexOf(d.source),target:enemies.findIndex(e=>e.id===d.target)+1,value:d.value,applied:d.applied})))
console.log(`Actual GameSession first two native hero ranged cycles match cast queues1248/1278, insert1249/1279, ${samples} projectile positions/aims through impact1261/1287, next-tick removals, damage8/8 and XP through1288; this is a source-specific coupled check, not full GameSession/video parity`)
