import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read('analysis/level-entity-bootstrap-3-iron-entry-runtime-constant.json'),commands=read('analysis/native-runtime-smoke-input.json'),g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},native.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const spawned=native.events.filter(e=>e.kind==='create'&&e.template.startsWith('enemy_')),bloods=native.events.filter(e=>e.kind==='create'&&e.template==='decal_blood_pool'),models=new Map(),queue=g.entities.queue.bind(g.entities)
g.entities.queue=(name,model,...args)=>{if(name.startsWith('enemy_'))models.set(model.id,model);return queue(name,model,...args)}
let corpseSamples=0,bloodSamples=0
for(const f of native.frames.slice(0,1390)){
 for(const c of commands.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
 g.advance(1/30)
 const context=`actual native death tick${f.tick}`
 for(const e of models.values())if(e.diedAt!==undefined&&g.enemyDeaths.supports(e)){
  const n=f.entities.find(n=>n.id===spawned[e.id-1].id),registered=!!g.entities.registry.entities.get(g.entities.entity(e).id)
  assert.equal(registered,!!n,context+'/corpse registry');assert.equal(g.enemies.includes(e),!!n,context+'/corpse model')
  if(!n)continue
  assert.equal(e.diedAt,n.death.at,context+'/health death clock');assert.equal(e.deathFinishedAt,n.death.finished,context+'/animation complete clock')
  const sprite=e.visualOverride;assert.equal(sprite?.name,n.animation,context+'/sprite name');assert.equal(sprite?.at,n.spriteTs,context+'/sprite clock');assert.equal(sprite?.facingLeft??false,n.death.flip,context+'/sprite facing')
  assert(Math.abs((e.corpseAlpha??255)-(n.death.alpha??255))<1e-8,context+'/corpse opacity');assert.equal(!!e.deathHidden,!!n.hiddenCount,context+'/hidden');corpseSamples++
 }
 const original=f.entities.filter(e=>e.template==='decal_blood_pool'),active=g.enemyDeaths.blood.filter(b=>g.entities.registry.entities.get(g.entities.entity(b).id)),created=g.entities.events.filter(e=>e.kind==='create'&&e.template==='decal_blood_pool')
 assert.equal(active.length,original.length,context+'/blood count')
 for(const b of active){const index=created.findIndex(e=>e.id===g.entities.entity(b).id),n=original.find(e=>e.id===bloods[index].id);assert(n,context+'/blood identity');assert.deepEqual(b.pos,n.pos,context+'/blood position');assert.equal(b.at,n.spriteTs,context+'/blood clock');assert(Math.abs(b.alpha-n.spriteAlpha)<1e-8,context+'/blood alpha');bloodSamples++}
}
const webBlood=g.entities.events.filter(e=>e.template==='decal_blood_pool'),webIds=webBlood.filter(e=>e.kind==='create').map(e=>e.id),ids=bloods.map(e=>e.id),canonical=(events,ids)=>events.filter(e=>e.tick<=1390).map(e=>({tick:e.tick,kind:e.kind,serial:ids.indexOf(e.id)}))
assert.deepEqual(canonical(webBlood,webIds),canonical(native.events.filter(e=>e.template==='decal_blood_pool'),ids))
assert(corpseSamples>0&&bloodSamples>0)
console.log(`Actual GameSession ${corpseSamples} native corpse states and ${bloodSamples} blood states through1390 match death/animation/facing/opacity, actual body registry removal, blood positions/clocks/alpha and all blood lifecycle events; wider global registry and other death families remain unverified`)
