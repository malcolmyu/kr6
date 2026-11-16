import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {HeroSystem} from '../src/game/HeroSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/gerald-cast-death-oracle.json');let frames=0
for(const row of rows){
 const b=new BarracksCombat(templates,()=>.25,()=>{}),heroes=new HeroSystem(templates,b,()=>.25),h=heroes.insertGerald({x:500,y:350},row.birth*(1/30)),skills=heroes.geraldSkills,ally=b.insertHero('soldier_knights_lvl1',{x:530,y:350},row.birth*(1/30),structuredClone(templates.soldier_knights_lvl1));ally.hp=100;h.target=ally.target={hp:100};skills.deferModifiers=true;skills.configure([`hero_gerald_${row.kind}`]);h.idleVisual={name:'attack_1',at:-1,loop:false}
 const events=[];let tick
 skills.onSound=sound=>events.push({tick,sound});skills.nativeModifiers.onQueue=(name,m)=>events.push({tick,name,target:m.target===h?'hero':'ally'});skills.nativeModifiers.onEffect=name=>events.push({tick,name})
 for(const f of row.frames){tick=f.tick;const time=tick*(1/30);if(tick===row.kill)h.hp=0;skills.advance(time,h,b.soldiers);if(!skills.casting)skills.advance(time,h,b.soldiers,true,true)
  const ctx=`${row.kind}/${row.birth}/${row.kill}/${tick}`;if(tick>row.birth){const pose=h.visualOverride??h.idleVisual;assert.equal(pose.name,f.name,ctx+'/cast or idle pose');assert.equal(pose.at,f.at,ctx+'/preserved clock');assert.equal(pose.loop??false,f.loop,ctx+'/loop')}
  assert.equal(h.xpQueued,f.xp,ctx+'/skill XP');frames++
 }
 assert.deepEqual(events,row.events,`${row.kind}/${row.birth}/${row.kill}/queued effects/modifiers/sounds`)
 assert(!skills.casting);assert(!h.scriptLocked)
}
console.log(`${rows.length} original Gerald A/B death continuations / ${frames} frames: pre-windup cancellation, due-time commit, post-commit idle/clock, XP and actual queued payloads match`)
