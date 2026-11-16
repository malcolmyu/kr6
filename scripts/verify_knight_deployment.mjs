import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {damageSoldier} from '../src/game/SoldierHealth.ts'
import {rallyFormation} from '../src/game/UnitPositions.ts'
import {nativeAnimationFrame} from '../src/game/NativeAnimation.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),counts=read('public/data/soldier-animation-frames.json'),rows=read('analysis/knight-deployment-oracle.json');let frames=0
for(const row of rows){
 let calls=0,tick=row.birth;const random=()=>{const v=row.scenario===8?[.91,.21,.81,.31,.71,.41,.61,.51][calls%8]:.25;calls++;return v},b=new BarracksCombat(templates,random,()=>{}),site={id:'fixture',tower:`tower_knights_lvl${row.rank}`,rally:{x:600,y:350}},events=[]
 b.onSound=name=>events.push({tick,kind:'sound',name});b.onStopSound=name=>events.push({tick,kind:'stop',name})
 for(let i=1;i<=3;i++){const template=structuredClone(templates[`soldier_knights_lvl${row.rank}`]);b.soldiers.push({id:i,siteId:'fixture',slot:i,name:`soldier_knights_lvl${row.rank}`,template,dodge:structuredClone(template.dodge),pos:{x:500+i*5,y:450+(i-2)*8},rally:rallyFormation(i,3,site.rally,25),center:{...site.rally},hp:template.health.hp_max,born:row.birth*(1/30),facingLeft:false,moving:false,readyAt:0,lastHitAt:-Infinity,regenCounter:0,deployUntil:0,deploying:true,firstRally:true,rallyCount:3})}
 const enemies=Array.from({length:3},(_,i)=>{const template=structuredClone(templates.enemy_bandit);delete template.melee;template.health.hp_max=10000;return{id:i+10,hp:10000,template,path:{position:{x:650+(i+1)*3,y:350+(i-1)*12},direction:{x:-40,y:0},finished:false,remainingNodes:100+i}}})
 for(let relative=1;relative<=120;relative++){
  tick=row.birth+relative;const time=tick*(1/30),n=row.frames[relative-1],context=`rank${row.rank}/birth${row.birth}/scenario${row.scenario}/tick${tick}`
  if([2,4,6,7].includes(row.scenario))enemies.forEach((e,i)=>e.path.position.x=(row.scenario===2&&relative>=20?650:750)+(i+1)*3)
  for(const input of row.inputs.filter(i=>i.tick===tick&&i.kind==='rally'))b.setRally(site,input.pos,time)
  b.advance(time,1/30,[],enemies)
  for(const input of row.inputs.filter(i=>i.tick===tick&&i.kind==='damage'))damageSoldier(b.soldiers[0],{value:input.value,damage_type:2},time)
  for(let i=0;i<3;i++){
   const s=b.soldiers[i],u=n.units[i],sprite=s.visualOverride??{name:s.moving?'walk':'idle',at:s.born,loop:true}
   assert(Math.hypot(s.pos.x-u.pos.x,s.pos.y-u.pos.y)<1e-8,context+`/s${i+1}/position ${JSON.stringify(s.pos)}/${JSON.stringify(u.pos)}`)
   assert.equal(s.hp,u.hp,context+'/HP');assert.equal(s.target?`e${enemies.indexOf(s.target)+1}`:undefined,u.target,context+'/target');assert.equal(sprite.name,u.animation,context+'/animation');assert.equal(sprite.at,u.ts,context+'/ts');assert.equal(sprite.loop,u.loop,context+'/loop');assert.equal(nativeAnimationFrame(counts[s.template.render.sprites[0].prefix][sprite.name],time-sprite.at,sprite.loop??false,30).frame+1,u.frame,context+'/frame')
   assert.equal(s.visBans??s.template.vis.bans,u.bans,context+'/vis bans');assert.equal(s.rallyImmunity??0,u.immune,context+'/immunity');assert.equal(s.firstRally,u.first,context+'/first latch');assert.equal(!!s.rallyRequested,u.rallyNew,context+'/new rally')
   assert.equal(enemies[i].hp,n.enemies[i].hp,context+'/enemy HP');assert.deepEqual(b.blockers(enemies[i]).map(s=>`s${s.id}`),n.enemies[i].blockers,context+'/blockers')
  }
  assert.equal(calls,n.calls,context+'/RNG calls');frames++
 }
 assert.deepEqual(events,row.events)
}
console.log(`${rows.length} original full knight deployment cases / ${frames} frames match fixed slot delays, first-time-only interception, late enemies, rally changes in wait/walk/attack, immunity/visibility, sprite clock/frames, damage, blocker order, RNG and sound start/stop`)
