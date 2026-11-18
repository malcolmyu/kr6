import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CulverineSulfurRuntime} from '../src/game/CulverineSulfurRuntime.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),templates=read('public/data/entities.json');let attempts=0
for(const row of read('analysis/culverine-a-modifier-oracle.json')){
 const e={name:'enemy_bandit',hp:100,template:structuredClone(templates.enemy_bandit),path:{position:{x:0,y:0}}};Object.assign(e.template.health,{magic_armor:row.initial.armor,raw_magic_armor:row.initial.raw});if(row.kind==='dead'){e.hp=0;e.diedAt=0}if(row.kind==='no-magic')e.template.enemy.can_accept_magic=false;if(row.kind==='mod-banned')e.template.vis.bans=4;if(row.kind==='boss')e.template.vis.flags=32
 const runtime=new CulverineSulfurRuntime(templates);let present=row.kind!=='missing';runtime.present=()=>present;runtime.candidates=()=>[] // Oracle calls own callbacks, without mod_lifecycle.
 const m=runtime.queueModifier(`mod_bullet_culverine_skill_a_lvl${row.rank}`,e,1),snapshot=(m,result)=>({result,armor:e.template.health.magic_armor,...(e.template.health.raw_magic_armor===undefined?{}:{raw:e.template.health.raw_magic_armor}),...(m.lost===undefined?{}:{lost:m.lost})}),ok=runtime.insert(m,0);assert.deepEqual(snapshot(m,ok),row.insert,`${row.rank}/${row.kind}/insert`)
 if(ok){if(row.kind.startsWith('overlap')){const second=runtime.queueModifier(m.name,e,1);assert.deepEqual(snapshot(second,runtime.insert(second,0)),row.secondInsert);const [a,b]=row.kind==='overlap-reverse'?[second,m]:[m,second];assert.deepEqual(snapshot(a,runtime.remove(a)),row.firstRemove);assert.deepEqual(snapshot(b,runtime.remove(b)),row.lastRemove)}else{if(row.kind==='remove-missing')present=false;assert.deepEqual(snapshot(m,runtime.remove(m)),row.remove)}}attempts++
}
console.log(`${attempts} original sulfur magic-armor insert/remove callback cases: all ranks, immunity/death/bans/raw overflow, overlapping callbacks and missing-target removal match; registry lifecycle checked separately`)
