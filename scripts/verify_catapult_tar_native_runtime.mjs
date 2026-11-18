import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CatapultTarRuntime} from '../src/game/CatapultTarRuntime.ts'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
// Exercise the production per-entity callbacks in the original insert/remove,
// main and tween phases against the independent original 48-scenario oracle.
class RegistryTarHarness {
 constructor(templates){
  this.runtime=new CatapultTarRuntime(templates);this.models=new WeakMap();this.areaKey=0
  this.registry=new NativeEntityRegistry(10,{onInsert:e=>this.runtime.insert(e.model,this.registry.time),onRemove:e=>{const result=this.runtime.remove(e.model,this.registry.time);if(result===false)e.pending_removal=false;return result}})
  this.runtime.id=m=>this.models.get(m)?.id??m.id
  this.runtime.present=e=>this.enemies.includes(e)
  this.runtime.enemies=()=>this.enemies
  this.runtime.candidates=enemy=>{const t=new LuaEntityTable();for(const e of this.registry.entities.values())if(e.model.kind==='modifier'&&e.model.enemy===enemy)t.set(e.id,e.model);return [...t.values()]}
  this.runtime.onQueue=m=>{const e=this.registry.create(id=>({id,model:m}));this.models.set(m,e);this.registry.queueInsert(e);if(m.kind==='area')m.oracleKey=++this.areaKey;else this.onQueue(m.enemy,m.level,this.registry.time)}
  this.runtime.onRemove=m=>this.registry.queueRemove(this.models.get(m))
 }
 onQueue=()=>{}
 queue(pos,rank){this.runtime.queue(pos,rank)}
 get areas(){return [...this.runtime.areas]}
 get slows(){return new Map([...this.runtime.slows].map(s=>[s.enemy.id,s]))}
 advance(time,enemies){this.enemies=enemies;this.registry.tick=Math.round(time*30)-1;this.registry.beginTick();for(const e of this.registry.entities.values())this.runtime.advance(e.model,time);for(const e of this.registry.entities.values())this.runtime.tween(e.model,time)}
}
let areaFrames=0
for(const row of read('analysis/catapult-tar-areas-oracle.json')){
 const enemies=[[0,0],[60,0],[60.001,0],[0,42],[0,0],[0,0],[0,0],[0,0],[0,0]].map(([x,y],i)=>{
  const template=structuredClone(templates.enemy_bandit);template.motion.max_speed=60;if(i===4)template.vis.flags|=128;if(i===5)template.vis.bans|=8;if(i===6)template.motion.invulnerable=true;if(i===7)template.vis.bans|=4;if(i===8)template.vis.flags|=1024
  return {id:i+1,hp:5000,template,path:new PathFollower([{x:500+x,y:350+y},{x:1500,y:350+y}])}
 }),system=new RegistryTarHarness(templates),events=[]
 system.onQueue=(e,level,at)=>events.push({target:e.id,level,at});system.queue({x:500,y:350},row.level)
 const normalize=mods=>mods.map(m=>({target:m.target??m.enemy.id,level:m.level,factor:m.factor,at:m.at,pending:m.pending})).sort((a,b)=>a.target-b.target||a.level-b.level)
 for(const [i,n]of row.frames.entries()){
  const tick=i+1,time=(row.birth+tick)*(1/30),ctx=`tar${row.birth}/${row.level}/${row.mode} tick${tick}`
  if(row.mode===2)enemies[0].path=new PathFollower([{x:tick>=31&&tick<61?900:500,y:350},{x:1500,y:350}])
  if(row.mode===3&&tick===31)enemies[0].hp=0
  if(row.mode===4)enemies[0].template.vis.bans=tick<31?8:0
  if(row.mode>=5&&row.mode<=7&&tick===31)system.queue({x:500,y:350},row.mode===5?row.level:row.mode===6?Math.min(3,row.level+1):Math.max(1,row.level-1))
  if(row.mode===8&&(tick===31||tick===61))enemies[0].template.motion.max_speed*=tick===31?.4:2.5
  system.advance(time,enemies)
  for(const [i,e]of enemies.entries())assert(Math.abs(e.template.motion.max_speed-n.speeds[i])<1e-9,ctx+' speed target'+e.id)
  const actual=normalize([...system.slows.values()]),expected=normalize(n.mods);assert.equal(actual.length,expected.length,ctx+' modifiers')
  for(const [index,m]of actual.entries()){const e=expected[index];for(const key of ['target','level','pending'])assert.equal(m[key],e[key],ctx+' '+key);for(const key of ['factor','at'])assert(Math.abs(m[key]-e[key])<1e-10,ctx+' '+key)}
  assert.equal(system.areas.length,n.areas.filter(a=>a.active).length,ctx+' visible areas')
  for(const a of system.areas){const e=n.areas.find(e=>e.key===a.oracleKey);assert.equal(a.level,e.level);assert.equal(a.pending,e.pending,ctx+' pending');for(const key of ['at','spriteAt','alpha'])assert(Math.abs(a[key]-e[key])<1e-8,ctx+' '+key+': '+a[key]+' != '+e[key]);assert.equal(a.fadeAt!==undefined,e.fadeAt!==undefined,ctx+' fading');if(e.fadeAt!==undefined)assert(Math.abs(a.fadeAt-e.fadeAt)<1e-10,ctx+' fade ts')}
  areaFrames++
 }
 const byEvent=(a,b)=>a.at-b.at||a.target-b.target||a.level-b.level;events.sort(byEvent);row.events.sort(byEvent);assert.equal(events.length,row.events.length)
 for(const [i,e]of events.entries()){assert.equal(e.target,row.events[i].target);assert.equal(e.level,row.events[i].level);assert(Math.abs(e.at-row.events[i].at)<1e-10)}
}
console.log(`${areaFrames} native tar aura/mod/tween frames match actual speed, next-tick inserts/removals, equal refresh, rank replacement/rejection, leave/return/death, visibility/motion immunity, independent speed factors and native ground fade`)
