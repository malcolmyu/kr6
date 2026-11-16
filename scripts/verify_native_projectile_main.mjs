import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),commands=read('analysis/native-runtime-smoke-input.json'),g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const names=new Set(['bolt_tower_wizard_lvl1','bullet_catapult_lvl1']),enemies=native.events.filter(e=>e.kind==='create'&&e.template.startsWith('enemy_')),originalQueues=native.events.filter(e=>e.kind==='queueInsert'&&names.has(e.template)&&e.tick<=1390),serials=new WeakMap(),queues=[],hits=[],mainCalls=new Map()
const c=g.combat,queue=c.onQueueProjectile,insert=c.onInsertProjectile,update=c.updateProjectiles.bind(c)
c.onQueueProjectile=(shot,name,time)=>{serials.set(shot,queues.length);queues.push({tick:Math.round(time*30),name});queue(shot,name,time)}
c.onInsertProjectile=(shot,p)=>{serials.set(p,serials.get(shot));insert(shot,p)}
c.updateProjectiles=(time,actors,projectiles)=>{
 assert.equal(projectiles.length,1,'normal runtime dispatches a single projectile')
 const p=projectiles[0],key=`${Math.round(time*30)}:${serials.get(p)}`;assert(!mainCalls.has(key),'projectile must not run twice');mainCalls.set(key,true)
 const before=c.projectileHits.length;update(time,actors,projectiles)
 for(const hit of c.projectileHits.slice(before))hits.push({tick:Math.round(time*30),serial:serials.get(p),target:hit.enemy.id,value:hit.damage.value})
}
for(const f of native.frames.slice(0,1390)){
 for(const command of commands.filter(c=>c.tick===f.tick))if(command.kind==='send_wave')g.callNextWave();else g.build(command.holder,command.tower)
 g.advance(1/30)
}
assert.deepEqual(queues,originalQueues.map(e=>({tick:e.tick,name:e.template})))
const ids=originalQueues.map(e=>e.id),expected=native.damageTrace.filter(d=>ids.includes(d.source)&&d.tick<=1390).map(d=>({tick:d.tick,serial:ids.indexOf(d.source),target:enemies.findIndex(e=>e.id===d.target)+1,value:d.value}))
// health consumes packets backwards; compare the source's main-phase packet
// sequence independently of the not-yet-unified global health queue.
const order=(a,b)=>a.tick-b.tick||a.serial-b.serial||a.target-b.target
assert.deepEqual(hits.toSorted(order),expected.toSorted(order))
const blast=hits.filter(h=>h.tick===1353);assert.deepEqual(blast.map(h=>h.value),[14,14,17,14])
console.log(`Actual GameSession ${queues.length} native wizard/catapult queues and ${hits.length} damage packets match source, tick, target and value through1390; each of ${mainCalls.size} projectile main updates runs once. Original1353 explosion yields14/14/17/14. Global health order, all registration IDs and later/full-video parity remain unverified.`)
