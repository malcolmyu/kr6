import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {EnemyDeathSystem,recordEnemyDamage} from '../src/game/EnemyDeath.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),rows=read('analysis/crow-death-oracle.json'),templates=read('public/data/entities.json');let samples=0
for(const row of rows){
 let tick=row.birth;const e={name:'enemy_crow',id:10,hp:10000,born:(row.birth+1)*(1/30),template:structuredClone(templates.enemy_crow),path:{position:{...row.initial.pos},direction:{x:-1,y:0}}},actors=[e],events=[],death=new EnemyDeathSystem(templates);let started=false
 death.cellAt=()=>tick>row.birth+row.fatal?row.terrain:1;death.onSound=name=>events.push({tick,kind:'sound',name});death.onBlood=b=>events.push({tick,kind:'effect',name:'decal_blood_pool',pos:b.pos,sprite:b.color});death.onEffect=fx=>events.push({tick,kind:'effect',name:fx.name,pos:fx.pos,sprite:fx.sprite});death.onRemove=m=>events.push({tick,kind:'queueRemove',name:m===e?e.name:m.name??'decal_blood_pool'})
 for(const f of row.frames){tick=f.tick;const time=tick*(1/30),context=`${row.birth}/${row.fatal}/${row.damageType}/${row.terrain}/${tick}`
  if(e.deathRemovalQueuedAt!==undefined&&time>e.deathRemovalQueuedAt&&actors.includes(e))events.push({tick,kind:'remove',name:e.name});for(const fx of death.effectModels)if(fx.removalQueuedAt!==undefined&&time>fx.removalQueuedAt)events.push({tick,kind:'remove',name:fx.name});death.beginTick(time,actors)
  // Prescribed original pre-fatal flight isolates the death coroutine; this is not a path/flight oracle.
  if(tick<=row.birth+row.fatal){Object.assign(e.path.position,f.pos);e.headingAngle=f.heading}
  const before=events.length
  if(tick>row.birth+row.fatal&&actors.includes(e))death.advanceMain(e,time)
  if(!started&&e.deathStartedAt!==undefined){started=true;events.splice(before,0,{tick,kind:'deathStart',name:e.name})}
  death.advanceTweens(time)
  if(tick===row.birth+row.fatal){e.hp=0;e.diedAt=time;recordEnemyDamage(e,row.damageType,time)}
  assert.equal(e.hp,f.hp,context+'/HP');assert.equal(actors.includes(e),f.inTable,context+'/registry');if(e.hp<=0){assert.equal(!!e.deathHidden,!!f.hidden,context+'/hidden');assert.equal(e.deathFinishedAt,f.deathFinished,context+'/finished');assert(Math.abs((e.corpseAlpha??255)-f.alpha)<1e-7,context+'/alpha');if(e.deathStartedAt!==undefined&&!e.deathHidden){assert.equal(e.visualOverride.name,f.animation);assert.equal(e.visualOverride.at,f.ts,context+'/animation clock');assert.equal(e.visualOverride.facingLeft,f.flip,context+'/flip')}samples++}
 }
 assert.deepEqual(events,row.events,`${row.birth}/${row.fatal}/${row.damageType}/${row.terrain}/complete death events`)
}
console.log(`${rows.length} original crow death cases/${samples} corpse frames: in-animation lethal waits, physical/magic/explosive/disintegrate/eat, land/water sounds/effects, completion hide, three-second hold and exact0.3s alpha/removal; pre-fatal flight prescribed, not flight acceptance`)
