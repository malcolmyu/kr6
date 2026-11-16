import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ArcherMarkRuntime} from '../src/game/ArcherMarkRuntime.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/archers-mark-oracle.json');let frames=0
for(const {level,birth,kind,frames:trace}of rows){
 const template=structuredClone(templates.enemy_bandit),pos={x:500,y:350},e={id:1,hp:1000,template,path:{position:pos,direction:{x:1,y:0},ni:100}},system=new ArcherMarkRuntime(templates.mod_archers_skill_c_weak)
 template.unit.mod_offset={x:7,y:13};template.health.damage_factor=kind==='stack'?1.2:1
 if(kind==='boss')template.vis.flags|=32;if(kind==='vis-ban')template.vis.bans|=4
 let incoming=[],removals=[],present=kind!=='missing',flip=false
 system.present=()=>present;system.facingLeft=()=>flip;system.onQueue=m=>incoming.push(m);system.onRemove=m=>removals.push(m)
 const add=rank=>{const m=system.queue(e,rank);if(kind==='last-node')m.lastNode=104}
 for(const [i,f]of trace.entries()){
  const tick=i+1,time=f.tick*(1/30)
  if(tick===1)add(level)
  if(tick===31&&kind==='refresh')add(level)
  if(tick===31&&kind==='upgrade'&&level<3)add(level+1)
  if(tick===31&&kind==='lower'&&level>1)add(level-1)
  if(tick===61&&kind==='dead'){e.hp=0;e.diedAt=time}
  if(tick===61&&kind==='removed')present=false
  if(kind==='last-node'&&tick>=31)e.path.ni=105
  if(kind==='move'){pos.x++;pos.y+=.5;flip=tick%60>=30}
  if(kind==='stack'&&tick===101)template.health.damage_factor*=1.4
  if(kind==='refresh-fade'&&tick===(level===1?155:level===2?185:215))add(level)
  const queued=incoming;incoming=[];for(const m of queued)system.insert(m,time)
  const removed=removals;removals=[];for(const m of removed)system.remove(m)
  for(const m of system.marks)system.advance(m,time)
  const ctx=`${level}/${birth}/${kind}/${tick}`,actual=system.marks.toSorted((a,b)=>a.level-b.level)
  assert.equal(template.health.damage_factor,f.factor,ctx+'/damage factor');assert.equal(actual.length,f.marks.length,ctx+'/registered marks')
  for(const [j,m]of actual.entries()){
   const native=f.marks[j];for(const key of ['level','at','spriteAt','duration','factor','animation','loop'])assert.equal(m[key],native[key],ctx+'/'+key)
   assert.equal(m.queued,native.pending,ctx+'/queue removal');assert.deepEqual(m.pos,native.pos,ctx+'/position alias');assert.deepEqual(m.offset,native.offset,ctx+'/flipped mod offset')
  }
  frames++
 }
}
console.log(`${rows.length} original archers mark traces / ${frames} frames: normal/boss multipliers, strict duration and full fade, same-level clock refresh, stronger replacement/lower rejection, dead/missing/removed targets, bans, last-node exit, position alias/flip and stacked factor restoration match`)
