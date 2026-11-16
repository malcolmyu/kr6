import {damageSoldier} from '../src/game/SoldierHealth.ts'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {EnemyDeathSystem,recordEnemyDamage} from '../src/game/EnemyDeath.ts'
import {EnemyMelee} from '../src/game/EnemyMelee.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
import {nativeAnimationFrame} from '../src/game/NativeAnimation.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),level=read('public/data/level03.json'),counts=read('public/data/enemy-melee-frames.json'),rows=read('analysis/enemy-death-oracle.json')
let samples=0
for(const row of rows){
 let tick=row.birth
 const path=new EnemyPath(level.paths.paths,level.navigation,1,1);path.ni=100;Object.assign(path.position,row.initial.pos)
 const e={id:10,name:row.name,born:row.birth*(1/30),template:structuredClone(templates[row.name]),path,hp:10000,headingAngle:path.headingToNextNode(templates[row.name].motion.max_speed)};delete e.template.ranged
 const s={id:1,name:'soldier_knights_lvl1',pos:{...row.initial.soldierPos},template:structuredClone(templates.soldier_knights_lvl1),dodge:structuredClone(templates.soldier_knights_lvl1.dodge),hp:100000,moving:false,lastHitAt:-Infinity},actors=[e],events=[]
 const melee=new EnemyMelee(()=>.25,()=>[s],new DodgeSystem(()=>.25,templates)),death=new EnemyDeathSystem(templates)
 death.cellAt=()=>tick>row.birth+row.fatal?row.terrain:1
 death.onSound=name=>events.push({tick,kind:'sound',name});melee.onSound=death.onSound
 death.onBlood=b=>events.push({tick,kind:'effect',name:'decal_blood_pool',pos:b.pos,sprite:b.color})
 death.onEffect=fx=>events.push({tick,kind:'effect',name:fx.name,pos:fx.pos,sprite:fx.sprite})
 death.onRemove=model=>events.push({tick,kind:'queueRemove',name:model===e?e.name:model.name??'decal_blood_pool'})
 let damageQueue=[]
 melee.onDamage=(source,target,attack,value)=>damageQueue.push({target,attack,value})
 let started=false
 for(const n of row.frames){
  tick=n.tick;const time=tick*(1/30),context=`${row.name}/birth${row.birth}/fatal${row.fatal}/type${row.damageType}/terrain${row.terrain}/tick${tick}`
  if(e.deathRemovalQueuedAt!==undefined&&time>e.deathRemovalQueuedAt&&actors.includes(e))events.push({tick,kind:'remove',name:e.name})
  for(const fx of death.effectModels)if(fx.removalQueuedAt!==undefined&&time>fx.removalQueuedAt)events.push({tick,kind:'remove',name:fx.name})
  for(const b of death.blood)if(b.removalQueuedAt!==undefined&&time>b.removalQueuedAt)events.push({tick,kind:'remove',name:'decal_blood_pool'})
  death.beginTick(time,actors)
  if(actors.includes(e)){
   if(e.hp>0)melee.advance(e,time)
   else death.advanceMain(e,time,()=>melee.resumeDeath(e,time))
   if(!started&&e.deathStartedAt!==undefined){started=true;events.push({tick,kind:'deathStart',name:e.name})}
  }
  death.advanceTweens(time)
  for(const hit of damageQueue.toReversed())damageSoldier(hit.target,{value:hit.value,damage_type:hit.attack.damage_type},time)
  damageQueue=[]
  if(tick===row.birth+row.fatal){recordEnemyDamage(e,row.damageType,time);e.hp=0;e.diedAt=time;e.deathManaged=true}
  assert.equal(s.hp,n.soldierHp,context+'/soldier HP from retained enemy attack')
  assert.equal(actors.includes(e),n.inTable,context+'/corpse registered');assert.equal(e.hp,n.hp,context+'/HP')
  const sprite=e.visualOverride??{name:'idle',at:e.born,loop:true}
  assert.equal(sprite.name,n.animation,context+'/animation');assert.equal(sprite.at,n.ts,context+'/sprite clock')
  if(n.inTable&&n.frame!==undefined)assert.equal(nativeAnimationFrame(counts[e.template.render.sprites[0].prefix][sprite.name],time-sprite.at,sprite.loop??false,30).frame+1,n.frame,context+'/atlas frame')
  assert(Math.abs((e.corpseAlpha??255)-(n.alpha??255))<1e-8,context+'/corpse opacity');assert.equal(!!e.deathHidden,!!n.hidden,context+'/hidden')
  assert.equal(e.deathFinishedAt,n.deathFinished,context+'/death animation completed')
  if(e.deathStartedAt!==undefined&&!e.deathHidden)assert.equal(sprite.facingLeft??false,n.flip,context+'/death facing')
  const blood=death.blood.filter(b=>time>b.at);assert.equal(blood.length,n.blood.length,context+'/blood registered')
  for(let i=0;i<blood.length;i++){assert.deepEqual(blood[i].pos,n.blood[i].pos,context+'/blood position');assert.equal(blood[i].at,n.blood[i].at,context+'/blood clock');assert(Math.abs(blood[i].alpha-n.blood[i].alpha)<1e-8,context+'/blood alpha')}
  samples++
 }
 const canonical=events=>events.filter(e=>e.kind!=='sound'||e.name!=='MeleeSword').filter(e=>e.kind!=='effect'||e.name!=='fx_shadow_blades_hit').map(e=>({...e})).sort((a,b)=>a.tick-b.tick||a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name))
 assert.deepEqual(canonical(events),canonical(row.events),`${row.name}/${row.birth}/${row.fatal}/${row.damageType}/${row.terrain}/death events`)
}
console.log(`${rows.length} original enemy main/death/health/tween traces / ${samples} frames match windup/idle death entry, five fatal damage types, land/water, corpse animation/alpha/hiding/removal and blood placement/alpha/lifetime; ranged, cliff and death spawns remain outside this gate`)
