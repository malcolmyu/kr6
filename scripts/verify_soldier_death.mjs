import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {damageSoldier} from '../src/game/SoldierHealth.ts'
import {nativeAnimationFrame} from '../src/game/NativeAnimation.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/soldier-death-tween-oracle.json')
const counts=read('public/data/soldier-animation-frames.json')
let frames=0
for(const row of rows){
 let calls=0,tick=row.birth
 const random=()=>{const value=.25;calls++;return value}
 const b=new BarracksCombat(templates,random,()=>{}),events=[]
 b.onRemove=s=>events.push({tick,kind:'queueRemove',key:`s${s.id}`});b.onSound=name=>events.push({tick,kind:'sound',name});b.onStopSound=name=>events.push({tick,kind:'stop',name})
 for(let i=1;i<=3;i++){
  const template=structuredClone(templates[`soldier_knights_lvl${row.rank}`]),pos={x:590+i*5,y:350+(i-2)*8}
  b.soldiers.push({id:i,siteId:'fixture',slot:i,name:`soldier_knights_lvl${row.rank}`,template,pos:{...pos},rally:{...pos},center:{x:600,y:350},hp:template.health.hp_max,born:row.birth/30,facingLeft:false,moving:false,readyAt:row.birth/30,lastHitAt:-Infinity,regenCounter:0,deployUntil:0,deploying:false})
 }
 const units=[...b.soldiers],splice=b.soldiers.splice.bind(b.soldiers)
 b.soldiers.splice=(...args)=>{const removed=splice(...args);for(const s of removed)events.push({tick,kind:'remove',key:`s${s.id}`});return removed}
 const enemies=Array.from({length:1},(_,i)=>{const template=structuredClone(templates.enemy_bandit);delete template.melee;template.health.hp_max=10000;return{id:i+10,template,hp:10000,path:{position:{x:650+(i+1)*3,y:350+(i-1)*12},direction:{x:-40,y:0},remainingNodes:100+i,finished:false}}})
 for(let relative=1;relative<=450;relative++){
  tick=row.birth+relative;const n=row.frames[relative-1],context=`rank${row.rank}/birth${row.birth}/scenario${row.scenario}/tick${tick}`
  b.advance(tick*(1/30),1/30,[],enemies)
  if(relative===[1,25,35,40,45,52][row.scenario-1])damageSoldier(units[1],{value:100000,damage_type:2},tick*(1/30))
  for(let i=0;i<3;i++){
   const s=units[i],u=n.units[i]
   assert.equal(b.soldiers.includes(s),u.inTable,context+`/s${i+1}/registered`);assert.equal(s.hp,u.hp,context+`/s${i+1}/hp`);if(!u.inTable)continue
   assert(Math.abs((s.corpseAlpha??255)-(u.alpha??255))<1e-8,context+'/corpse alpha')
   assert.equal(s.target?`e${enemies.indexOf(s.target)+1}`:undefined,u.target,context+`/s${i+1}/target`)
   assert(Math.hypot(s.pos.x-u.pos.x,s.pos.y-u.pos.y)<1e-8,context+`/s${i+1}/position ${JSON.stringify(s.pos)} / ${JSON.stringify(u.pos)}`)
   assert.equal(s.visualOverride?.name??(s.moving?'walk':'idle'),u.animation,context+`/s${i+1}/animation`)
   assert.equal(b.knightStates.get(s).attackTs,u.attackTs,context+`/s${i+1}/attackTs`)
   if(s.visualOverride&&(u.attackTs>0||u.animation==='death')){assert.equal(s.visualOverride.at,u.ts,context+'/sprite ts');assert.equal(nativeAnimationFrame(counts[s.template.render.sprites[0].prefix][u.animation],tick*(1/30)-s.visualOverride.at,s.visualOverride.loop??false,30).frame+1,u.frame,context+'/sprite frame')}

  }
  assert.equal(enemies[0].hp,n.enemies[0].hp,context+'/enemy hp');assert.deepEqual(b.blockers(enemies[0]).map(s=>`s${s.id}`),n.enemies[0].blockers,context+'/blocker order')
  assert.equal(calls,n.calls,context+'/rng calls');frames++
 }
 assert.deepEqual(events,row.events)
}
console.log(`${rows.length} original three-knight fatal-hit cases / ${frames} frames match death health/main phases, attack interruption, retained blockers and rotation, sound start/stop, atlas frames, corpse removal queue/insertion boundary, HP and RNG`)
