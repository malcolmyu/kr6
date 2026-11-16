import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),inputs=read('analysis/native-runtime-smoke-input.json')
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const r=g.heroes.ranged,queues=[],models=new Map(),queue=r.onParticleCreate,remove=r.trails.onRemove,nativeQueues=native.events.filter(e=>e.kind==='queueInsert'&&e.template==='ps_bullet_zefira'),events=[]
r.onParticleCreate=(name,time,p)=>{queue(name,time,p);const serial=queues.length;queues.push({tick:Math.round(time*30),source:p.id});models.set(p.id,g.entities.registry.pendingInserts.at(-1));events.push({kind:'queueInsert',tick:Math.round(time*30),serial})}
r.trails.onRemove=t=>{events.push({kind:'queueRemove',tick:Math.round(g.time*30),serial:queues.findIndex(q=>q.source===t.sourceId)});remove(t)}
let states=0,particles=0
const close=(a,b,ctx)=>assert(Math.abs(a-b)<1e-8,`${ctx}: ${a}/${b}`)
for(const f of native.frames.slice(0,1390)){
 for(const c of inputs.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
 g.advance(1/30)
 const originals=f.entities.filter(e=>e.template==='ps_bullet_zefira'),trails=r.trails.trails.filter(t=>g.entities.registry.entities.get(models.get(t.sourceId)?.id))
 assert.equal(trails.length,originals.length,`tick${f.tick}/emitter count`)
 for(const t of trails){const serial=queues.findIndex(q=>q.source===t.sourceId),n=originals.find(e=>e.id===nativeQueues[serial].id)?.particles,ctx=`tick${f.tick}/trail${serial}`;assert(n,ctx);close(t.at,n.at,ctx+'/birth');close(t.emitTs,n.emitTs,ctx+'/emit clock');assert.equal(t.emit,n.emit,ctx+'/emit');assert.equal(t.particles.length,n.particles.length,ctx+'/count')
  for(const [i,p]of t.particles.entries()){const q=n.particles[i];for(const k of ['at','lifetime','rotation','alpha','drawOrder'])close(p[k],q[k],ctx+'/'+k);for(const k of ['x','y']){close(p.pos[k],q.pos[k],ctx+'/pos');close(p.scale[k],q.scale[k],ctx+'/scale')}assert.equal(p.frame,q.frame,ctx+'/frame');particles++}states++
 }
}
assert.equal(queues.length,2)
assert.deepEqual(events,native.events.filter(e=>['queueInsert','queueRemove'].includes(e.kind)&&e.template==='ps_bullet_zefira').map(e=>({kind:e.kind,tick:e.tick,serial:nativeQueues.findIndex(q=>q.id===e.id)})))
console.log(`Actual GameSession Zefira particles: two native emitter queue/removal lifecycles, ${states} active states and ${particles} particle samples match through1390; semantic identity after the separate global1331 gap`)
