import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {nativeAnimationFrame} from '../src/game/NativeAnimation.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/soldier-combat-oracle.json')
const counts=read('public/data/soldier-animation-frames.json')
let frames=0
for(const row of rows){
 let calls=0,tick=row.birth
 const random=()=>{const value=row.scenario===6?[.91,.21,.81,.31,.71,.41,.61,.51][calls%8]:.25;calls++;return value}
 const b=new BarracksCombat(templates,random,()=>{}),events=[]
 b.onSound=name=>events.push({tick,kind:'sound',name});b.onStopSound=name=>events.push({tick,kind:'stop',name})
 for(let i=1;i<=3;i++){
  const template=structuredClone(templates[`soldier_knights_lvl${row.rank}`]),pos={x:590+i*5,y:350+(i-2)*8}
  b.soldiers.push({id:i,siteId:'fixture',slot:i,name:`soldier_knights_lvl${row.rank}`,template,pos:{...pos},rally:{...pos},center:{x:600,y:350},hp:template.health.hp_max,born:row.birth/30,facingLeft:false,moving:false,readyAt:row.birth/30,lastHitAt:-Infinity,regenCounter:0,deployUntil:0,deploying:false})
 }
 const enemies=Array.from({length:3},(_,i)=>{const template=structuredClone(templates.enemy_bandit);delete template.melee;template.health.hp_max=10000;return{id:i+10,template,hp:10000,path:{position:{x:650+(i+1)*3,y:350+(i-1)*12},direction:{x:-40,y:0},remainingNodes:100+i,finished:false}}})
 for(let relative=1;relative<=360;relative++){
  tick=row.birth+relative;const n=row.frames[relative-1],context=`rank${row.rank}/birth${row.birth}/scenario${row.scenario}/tick${tick}`
  if(row.scenario===2&&relative===50||row.scenario===3&&relative===70)enemies[0].hp=0
  if(row.scenario===4)enemies.forEach((e,i)=>e.path.position.x=(relative<50?750:650)+(i+1)*3)
  if(row.scenario===5)enemies.slice(0,2).forEach(e=>e.template.enemy.max_blockers=1)
  b.advance(tick*(1/30),1/30,[],enemies)
  for(let i=0;i<3;i++){
   const s=b.soldiers[i],u=n.units[i]
   assert.equal(s.target?`e${enemies.indexOf(s.target)+1}`:undefined,u.target,context+`/s${i+1}/target`)
   assert(Math.hypot(s.pos.x-u.pos.x,s.pos.y-u.pos.y)<1e-8,context+`/s${i+1}/position ${JSON.stringify(s.pos)} / ${JSON.stringify(u.pos)}`)
   assert.equal(s.visualOverride?.name??(s.moving?'walk':'idle'),u.animation,context+`/s${i+1}/animation`)
   assert.equal(b.knightStates.get(s).attackTs,u.attackTs,context+`/s${i+1}/attackTs`)
   if(s.visualOverride&&u.attackTs>0){assert.equal(s.visualOverride.at,u.ts,context+'/sprite ts');assert.equal(nativeAnimationFrame(counts[s.template.render.sprites[0].prefix][u.animation],tick*(1/30)-s.visualOverride.at,s.visualOverride.loop??false,30).frame+1,u.frame,context+'/sprite frame')}
   assert.equal(enemies[i].hp,n.enemies[i].hp,context+`/e${i+1}/hp`)
   assert.deepEqual(b.blockers(enemies[i]).map(s=>`s${s.id}`),n.enemies[i].blockers,context+`/e${i+1}/blockers`)
  }
  assert.equal(calls,n.calls,context+'/rng calls');frames++
 }
 assert.deepEqual(events,row.events.filter(e=>e.kind==='sound'||e.kind==='stop'))
}
console.log(`${rows.length} original three-knight combat cases / ${frames} frames match positions, retained targets, blocker rotation, attack animation, cooldowns, HP, RNG and sound start/stop`)
