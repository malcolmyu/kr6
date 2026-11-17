import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ArcherPierceRaySystem} from '../src/game/ArcherPierceRay.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/archers-pierce-ray-oracle.json');let checked=0
for(const {level,birth,factor,kind,frames,events:expected}of rows){
 const enemy={hp:1000,template:structuredClone(templates.enemy_bandit),path:{position:{x:620,y:380},direction:{x:1,y:0}}};enemy.template.unit.hit_offset={x:3,y:13}
 const events=[];let tick,draws=0
 const system=new ArcherPierceRaySystem(templates,()=>{draws++;return .25}),p=templates.tower_archers_lvl4.powers.skill_a
 system.onDamage=(_r,_e,damage,type)=>events.push({tick,damage,type})
 system.onModifier=(name,_e,level)=>events.push({tick,name,pos:{x:0,y:0},level,target:true})
 system.onEffect=(name,pos)=>events.push({tick,name,pos})
 const ray=system.queue({name:`bullet_archers_skill_a_lvl${level}`,from:{x:516,y:415},to:{x:623,y:393},target:enemy,min:p.damage_min[level-1],max:p.damage_max[level-1],factor,flight:.4});system.insert(ray)
 for(const [i,f]of frames.entries()){
  tick=f.tick;const relative=i+1,time=tick*(1/30),context=`${level}/${birth}/${factor}/${kind}/${relative}`
  if(kind==='moving')enemy.path.position.x=620+relative*2
  if(kind==='dead')enemy.hp=0
  if(kind==='banned')enemy.template.vis.bans=2
  system.advance(ray,time,kind==='missing'||kind==='removed-later'&&relative>=2?[]:[enemy])
  assert.equal(ray.born,f.ts,context+'/sprite clock');assert.equal(ray.hidden,f.hidden,context+'/hidden');assert.equal(ray.removed,f.removed,context+'/remove');assert.equal(draws,f.draws,context+'/rng');assert.ok(Math.abs(ray.rotation-f.rotation)<1e-12,context+'/rotation');assert.ok(Math.abs(ray.scale.x-f.scale.x)<1e-12,context+'/scale');assert.equal(ray.scale.y,f.scale.y);checked++
 }
 assert.deepEqual(events,expected.map(({track,source,...event})=>event),`${level}/${birth}/${factor}/${kind}/damage-mod-fx sequence`)
}
console.log(`${rows.length} original Archer A ray traces / ${checked} frames: first-main damage/RNG/modifier/FX order, hidden frame, fixed endpoint/scale/clock, dead/missing/moving/banned targets, sale independence and exact removal match`)
