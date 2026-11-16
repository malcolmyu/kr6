import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {ZefiraTalents} from '../src/game/ZefiraTalents.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
let frames=0
for(const row of read('analysis/zefira-weakness-oracle.json')){
 const h=new HeroSystem(templates,new BarracksCombat(templates)).insert('hero_zefira',{x:500,y:350},row.born),t=new ZefiraTalents(),e={id:999,hp:1000,path:{position:{x:530,y:350}},template:structuredClone(templates.enemy_blackguard)},pulses=[]
 e.template.health.armor=.3;e.template.health.magic_armor=.4;t.configure(['talent_1']);t.insertAura(h);t.onQueueModifier=(_,time)=>pulses.push(time)
 for(const [frame,sample]of row.frames.entries()){
  const time=row.born+frame/30
  if(row.mode==='move')h.pos.x=frame>=35&&frame<75?100:500
  if(row.mode==='death')h.hp=frame>=35&&frame<105?0:h.template.health.hp_max
  if(row.mode==='immune'){e.template.vis.bans=frame<60?4:0;e.template.enemy.can_accept_magic=frame<120}
  t.advance(time,h,[e]);const health=e.template.health
  assert(Math.abs(health.armor-sample.armor)<1e-10,`${row.born}/${row.mode}/${frame} armor`)
  assert(Math.abs(health.magic_armor-sample.magic)<1e-10);assert.equal(t.weaknesses.size,sample.active)
  for(const [key,native]of [['raw_armor','raw'],['raw_magic_armor','rawMagic']])if(sample[native]!==undefined)assert(Math.abs(health[key]-sample[native])<1e-10)
  frames++
 }
 assert.deepEqual(pulses.map(n=>Math.round((n-row.born)*30)),row.events.map(e=>Math.round((e.at-row.born)*30)))
}
console.log(`${frames} native Zefira weakening aura frames match: next-tick insertion, repeated refresh, movement/death suspension, magic acceptance and original non-restoring raw armour arithmetic`)
for(const row of read('analysis/zefira-weakness-eligibility.json')){
 const c=row.config,h=new HeroSystem(templates,new BarracksCombat(templates)).insert('hero_zefira',{x:500,y:350},0),t=new ZefiraTalents(),e={id:999,hp:1000,path:{position:{x:500+c.x,y:350+c.y}},template:structuredClone(templates.enemy_blackguard)},health=e.template.health
 health.raw_armor=c.raw;health.raw_magic_armor=c.magicRaw;health.armor=c.raw===undefined?.3:Math.max(0,Math.min(1,c.raw));health.magic_armor=c.magicRaw===undefined?.4:Math.max(0,Math.min(1,c.magicRaw))
 if(c.boss)e.template.vis.flags|=32;if(c.air)e.template.vis.flags|=128;if(c.immune)e.template.vis.bans=4;if(c.noMagic)e.template.enemy.can_accept_magic=false
 t.configure(['talent_1']);t.insertAura(h);t.advance(0,h,[e]);t.advance(1/30,h,[e])
 assert.equal(t.weaknesses.size>0,row.inserted);assert(Math.abs(health.armor-row.armor)<1e-10);assert(Math.abs(health.magic_armor-row.magic)<1e-10)
 h.pos.x=0;for(let i=2;i<=40;i++)t.advance(i/30,h,[e]);assert(Math.abs(health.armor-row.afterArmor)<1e-10);assert(Math.abs(health.magic_armor-row.afterMagic)<1e-10)
}
console.log('10 original weakening eligibility/arithmetic cases match ellipse boundary, boss/air/mod/magic exclusions and unclamped raw armour')
