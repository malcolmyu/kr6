import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
import {NativeSpatialEntities} from '../src/game/NativeSpatialEntities.ts'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const spatial=true
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/culverine-sulfur-spatial-impact-oracle.json')
// The native impact fixture explicitly disables particles to isolate flight and impact.
for(const rank of [1,2,3])templates[`bullet_culverine_skill_a_lvl${rank}`].bullet.particles_name=undefined
for(const row of rows){
 const origin=row.origin??{x:620,y:350}
 let calls=0;const random=()=>{calls++;return .1},c=new RangedCombat(templates,random,()=>{}),mods=[],fx=[],sounds=[],packets=[];const resolve=c.resolveProjectileHits;c.resolveProjectileHits=function(time){for(const h of this.projectileHits)packets.push({target:h.enemy.id,value:h.damage.value,type:h.damage.damage_type});return resolve.call(this,time)};c.deferProjectileInsertSound=true; // Native fixture invokes own insert directly; full battle checks engine insertion sounds.
 c.dodges=new DodgeSystem(random,templates);c.cellAt=()=>row.water?2:1
 c.onSulfurDecal=(name,pos)=>fx.push({name,pos:{...pos}});c.onSulfurLanded=(name,pos)=>fx.push({name,pos:{...pos}});c.onEffect=(name,pos)=>fx.push({name,pos:{...pos}});c.onSound=name=>sounds.push(name)
 const enemies=[[0,0],[45,0],[90,0],[90.00001,0],[0,63],[0,63.00001],[0,0],[0,0]].map(([x,y],i)=>{const e={id:i+1,hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:origin.x+x,y:origin.y+y},{x:1200,y:350}])};if(i===6)e.template.vis.flags|=128;if(i===7)e.template.vis.bans|=8;return e})
 if(spatial){const table=new LuaEntityTable(),grid=new NativeSpatialEntities();for(const [i,e]of enemies.entries())table.set(row.actorIds[i],{id:row.actorIds[i],pos:e.path.position,health:e.template.health,vis:e.template.vis,model:e});grid.rebuild(table,{left:-512/3,right:1024+512/3,bottom:0,top:768});c.enemyCandidates=(pool,p,r)=>{const found=[];grid.filter(found,'targets',p.x,p.y,r);return found.map(v=>v.model).filter(e=>pool.includes(e))}}
 const site={id:'source',pos:{x:origin.x-120,y:origin.y},damageFactor:row.factor},damage=[40,100,160][row.level-1]
 c.culverineTowers.onSulfurShoot(`bullet_culverine_skill_a_lvl${row.level}`,{x:origin.x-120,y:origin.y+40},origin,row.factor,0,{z:3000,sort_y_offset:1})
 let projectile
 for(const [tick,n]of row.frames.entries()){
  c.advance(tick*(1/30),[],enemies);projectile??=c.projectiles[0]
  const context=`${row.level}/${row.factor}/${row.water}/${tick}`
  assert.equal(projectile.done,n.done,context+'/done');assert.equal(calls,n.calls,context+'/RNG');assert.deepEqual(enemies.map(e=>e.hp),n.hp,context+'/HP')
  for(const k of ['x','y'])assert(Math.abs(projectile.pos[k]-n.pos[k])<1e-7,context+'/position');assert(Math.abs(projectile.bombMotion.rotation-n.rotation)<1e-7,context+'/rotation');assert.equal(projectile.bombMotion.hidden,n.hidden,context+'/hidden')
 }
 assert.deepEqual(packets,row.packets,'Original spatial bomb damage queue target order');
 assert.deepEqual(spatial?mods:mods.toSorted((a,b)=>a.target-b.target),spatial?row.mods:row.mods.toSorted((a,b)=>a.target-b.target));assert.deepEqual(fx.map(e=>e.name).sort(),row.fx.map(e=>e.name).sort());assert.deepEqual(sounds,row.sounds)
 assert.equal(c.dodges.pops.length,row.pops.length);for(const [i,p]of c.dodges.pops.entries()){const n=row.pops[i];for(const k of ['x','y'])assert(Math.abs(p.pos[k]-n.pos[k])<1e-7);assert(Math.abs(p.rotation-n.rotation)<1e-9);assert.equal(p.frame,n.frame)}
}
console.log(`${spatial?'Original SSO target order: ':''}${rows.length} native sulfur impact cases: ballistic facing/hiding, three damage levels, exact elliptical boundary/visibility, actual source factor, queued sulfur payload, land/water FX/sounds/pop and random count`)
