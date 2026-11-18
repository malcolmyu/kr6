import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CulverineNativeRuntime} from '../src/game/CulverineNativeRuntime.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json');let attempts=0
for(const row of read('analysis/culverine-b-insert-oracle.json')){
 const target={template:structuredClone(templates.enemy_bandit),hp:row.kind==='dead'?0:100,name:'enemy_bandit',path:{position:{x:0,y:0}}},h=target.template.health
 h.armor=row.kind==='zero'?0:row.kind==='near-zero'?.01:row.kind==='over-cap'?1:.2
 if(row.kind==='over-cap')h.raw_armor=1.2;else if(row.kind==='raw-positive')h.raw_armor=.7
 if(row.kind==='mod-banned')target.template.vis.bans=4;if(row.kind==='boss')target.template.vis.flags=32
 const runtime=new CulverineNativeRuntime(templates,()=>{throw Error('Insert must not draw RNG')});runtime.present=()=>row.kind!=='missing'
 for(const native of row.frames){const model={kind:'armor',name:`mod_bullet_culverine_skill_b_lvl${row.rank}`,pos:{x:0,y:0},target,targetId:1,level:0};assert.equal(runtime.insert(model),native.result);assert.equal(h.armor,native.armor,`${row.rank}/${row.kind}/${native.tick}/armor`);assert.equal(h.raw_armor,native.raw,`${row.rank}/${row.kind}/${native.tick}/raw`);assert.equal(runtime.auras.size+runtime.decals.size+runtime.rays.length,0);attempts++}
}
console.log(`${attempts} original permanent armor insert attempts: ranks1/2/3, depletion, zero/overcap/raw armor, dead/missing targets, bans/Boss, rejected registration and no RNG match`)
