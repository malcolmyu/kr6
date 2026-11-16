import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {GeraldTalents} from '../src/game/GeraldTalents.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),make=born=>new HeroSystem(templates,new BarracksCombat(templates)).insertGerald({x:500,y:350},born)
let frames=0
for(const row of read('analysis/gerald-regen-oracle.json')){
 const h=make(row.born),t=new GeraldTalents();t.configure(['talent_2']);t.insertRegeneration(h);h.hp=120
 for(const sample of row.frames){const time=Math.round(sample.at*30)/30,frame=Math.round((time-row.born)*30)
  if(frame===30)h.hp-=70
  if(row.mode==='conditions'){h.template.vis.bans=frame>=90&&frame<120?4:0;h.modifierTypes=new Set(frame>=150&&frame<180?['freeze']:[])}
  if(row.mode==='growth'&&frame===120){h.template.health.hp_max=400;h.hp=200}
  if(frame===240)h.hp=0
  t.advance(time,h)
  assert(Math.abs(h.hp-sample.hp)<1e-8,`${row.born}/${row.mode}/${time}: ${h.hp} vs ${sample.hp}`)
  assert.equal(!t.regeneration,sample.removed)
  if(t.regeneration){assert(Math.abs(t.regeneration.ts-sample.ts)<1e-8);assert.equal(t.regeneration.health,row.regen)}frames++
 }
}
// Reinsert only after the death/rewind coroutine returns; a new aura snapshots the new maximum.
{
 const h=make(0),t=new GeraldTalents();t.configure(['talent_2']);t.advance(0,h);h.hp=0;t.advance(1,h);assert(!t.regeneration)
 h.template.health.hp_max=400;h.hp=160;t.advance(3,h,false);assert(!t.regeneration)
 t.advance(5,h,true);assert.equal(t.regeneration.health,12);assert.equal(h.hp,160)
 t.advance(5+1/30,h,true);assert.equal(h.hp,172,'Native overdue aura catches up at most once per update')
 const disabled=new GeraldTalents();disabled.advance(20,h);assert(!disabled.regeneration)
}
console.log(`${frames} original Gerald regeneration frames match: late-birth catch-up, stun immunity, freeze/mod bans, fixed insertion heal amount, death and reinsert`)

for(const row of read('analysis/gerald-regen-survivor-oracle.json')){
 const heroes=new HeroSystem(templates,new BarracksCombat(templates)),h=heroes.insertGerald({x:500,y:350},0)
 heroes.geraldTalents.configure(['talent_2']);heroes.geraldTalents.insertRegeneration(h)
 heroes.survivor.configure(['skill_c',...(row.level>=2?['upg_sc1']:[]),...(row.level===3?['upg_sc2']:[])])
 for(const sample of row.frames){const time=Math.round(sample.at*30)/30;if(Math.round(time*30)===3){h.hp=0;h.diedAt=time}heroes.advance(time,1)
  assert(Math.abs(h.hp-sample.hp)<1e-8,`survivor${row.level} at ${time}: ${h.hp} vs native ${sample.hp}`)
 }
}
console.log('723 original Gerald recovery/regeneration frames match; aura inserts after recovery and starts updating on the following tick')
