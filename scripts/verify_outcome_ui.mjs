import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
import {outcomePlan,outcomePoses} from '../src/game/OutcomeAnimation.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/outcome.json'),oracle=read('analysis/outcome-ui-oracle.json')
for(const row of oracle){
 const plan=outcomePlan(row.kind,row.stars,row.mode===3)
 assert.equal(plan.initialSound,row.sounds[0].name)
 assert.equal(plan.sounds.length,row.sounds.length-1)
 for(const [i,sound]of plan.sounds.entries()){assert.equal(sound.name,row.sounds[i+1].name);assert(Math.abs(sound.delay-row.sounds[i+1].delay)<1e-12)}
 for(const [id,node]of Object.entries(row.nodes))if(node.animation){assert.equal(plan.actors[id]?.animation,node.animation)}
 for(const [id,actor]of Object.entries(plan.actors)){if(id==='vd_exo_gems')continue;assert.equal(row.nodes[id]?.hidden,false);assert(data.exos[data.template.children.find(n=>n.id===id).exo_name].animations.some(a=>a.name===actor.animation))}
}
for(const row of read('analysis/outcome-ui-base-oracle.json')){
 assert.equal(outcomePlan('victory',3,false,row.noGems).actors.vd_exo_gems.animation,row.animation)
 assert.equal(row.labelHidden,row.noGems)
 assert.equal(row.fade.duration,.3);assert.equal(row.fade.alpha,1)
}
assert.equal(data.noGems,true,'Reference desktop video uses the native no-gems presentation')
assert.equal(outcomePoses(data,0,true,false).l3_group_vd_continue[6],true)
assert.equal(outcomePoses(data,4.5,true,false).l3_group_vd_continue[6],false)
assert.equal(outcomePoses(data,0,false,false).l3_group_vd_continue[6],true)
assert.equal(outcomePoses(data,3,false,false).l3_group_vd_continue[6],false)
assert(!outcomePoses(data,3,true,false).timeline_vd_modes_badge)
assert(outcomePoses(data,3,true,true).timeline_vd_modes_badge)
const names=new Set(Object.entries(data.atlas).flatMap(([name,f])=>[name,...f.alias]))
for(const e of Object.values(data.exos))for(const part of e.parts)assert(names.has(part[0]),`Missing outcome EXO part ${part[0]}`)
for(const file of data.textures)assert(existsSync('public/assets/'+file))
for(const p of read('public/data/comic02.json').pages)for(const s of p.sprites)assert(existsSync('public/assets/'+s.image+'.png'))
console.log(`${oracle.length} original victory/defeat show-function cases match animations and delayed star sounds; native button/badge sequences and all outcome/post-victory comic resources available`)
