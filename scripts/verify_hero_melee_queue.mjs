import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {HeroSystem} from '../src/game/HeroSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/hero-melee-queue-oracle.json')
let frames=0,packets=0
for(const row of rows){
 let calls=0,time
 const b=new BarracksCombat(templates,()=>{calls++;return row.roll},()=>{}),heroes=new HeroSystem(templates,b,()=>row.roll),h=heroes.insert(row.name,{x:500,y:350},row.birth/30),a=h.template.melee.attacks[row.attack-1]
 // The original coroutine receives this chosen attack. Its selection is not part of this oracle.
 a.pop=undefined;a.chance=1;a.critical_chance=undefined;h.template.melee.attacks=[a];h.readyAt=-Infinity;h.facingLeft=row.side<0;b.deferDamage=true
 const template=structuredClone(templates.enemy_bandit);template.health.armor=row.kind==='armor'?.5:0;template.health.ignore_damage=row.kind==='immune'
 const e={id:999,name:'enemy_bandit',hp:row.kind==='lethal'?3:1000,template,path:{position:{x:500+row.side*30,y:350},finished:false}},effects=[],sounds=[];h.target=e
 b.onEffect=(name,pos)=>effects.push({tick:Math.round(time*30),name,pos:{...pos}});b.onSound=name=>sounds.push({tick:Math.round(time*30),name})
 for(const [i,n]of row.frames.entries()){
  time=n.tick*(1/30);if(row.kind==='unblocked'&&i===1)h.target=undefined
  const ctx=`${row.name}/${row.attack}/${row.birth}/${row.side}/${row.kind}/${row.roll}/${n.tick}`
  b.soldierAttack(h,e,time)
  assert.equal(e.hp,n.before,ctx+'/main must not directly reduce HP')
  assert.deepEqual(b.knightDamage.map(hit=>({value:hit.packet.value,damage_type:hit.packet.damage_type,xp:hit.xpFactor})),n.pending,ctx+'/health queue')
  assert.equal(calls-1,n.calls,ctx+'/RNG after prescribed selection');packets+=n.pending.length
  b.resolveDamage(time,[e]);assert.equal(e.hp,n.hp,ctx+'/health result');frames++
 }
 assert.deepEqual(effects,row.effects,`${row.name}/${row.attack}/${row.kind}/hit FX`);assert.deepEqual(sounds,row.sounds,`${row.name}/${row.attack}/${row.kind}/sounds`)
}
console.log(`${rows.length} original prescribed hero melee/health traces, ${frames} frames and ${packets} packets match deferred HP, damage/RNG, both facing hit-FX offsets, cast sounds, immunity, armor, lethal hits and lost blockers; selection/completion are outside this oracle`)
