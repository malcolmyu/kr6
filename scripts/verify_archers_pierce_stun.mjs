import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ArcherPierceStunSystem} from '../src/game/ArcherPierceStun.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/archers-pierce-stun-oracle.json');let checked=0
for(const {rank,birth,kind,frames}of rows){
 const e={id:1,hp:1000,template:structuredClone(templates.enemy_bandit),path:{position:{x:500,y:350},direction:{x:1,y:0}}},system=new ArcherPierceStunSystem(templates);e.template.unit.mod_offset={x:7,y:13}
 if(kind==='boss')e.template.vis.flags|=32;if(kind==='vis-ban')e.template.vis.bans|=4;if(kind==='ignore-stun')e.template.unit.ignore_stun=true
 let incoming=[],removals=[],present=kind!=='missing',flip=false
 system.present=()=>present;system.facingLeft=()=>flip;system.onQueue=m=>incoming.push(m);system.onRemove=m=>removals.push(m)
 const add=(r,other=false)=>system.queue(other?'mod_zefira_skill_a_stun':`mod_archers_skill_a_stun_lvl${r}`,e)
 for(const [i,f]of frames.entries()){
  const tick=i+1,time=f.tick*(1/30),ctx=`${rank}/${birth}/${kind}/${tick}`
  if(tick===1)add(rank)
  if(tick===31){if(kind==='refresh')add(rank);if(kind==='upgrade')add(Math.min(3,rank+1));if(kind==='lower')add(Math.max(1,rank-1));if(kind==='other-stun')add(1,true)}
  if(tick===61&&kind==='dead'){e.hp=0;e.diedAt=time}
  if(tick===61&&kind==='removed')present=false
  if(kind==='move'){e.path.position.x++;flip=tick%60>=30;e.template.unit.mod_offset.x=tick%40>=20?11:7}
  const inserted=incoming;incoming=[];for(const m of inserted)system.insert(m,time)
  const removed=removals;removals=[];for(const m of removed)system.remove(m)
  for(const m of system.stuns)system.advance(m,time)
  assert.equal(e.template.unit.stun_count??0,f.count,ctx+'/stun count');assert.equal(e.template.unit.is_stunned??false,f.stunned,ctx+'/stunned')
  const actual=system.stuns.toSorted((a,b)=>a.key.localeCompare(b.key)).map(m=>({key:m.key,ts:m.ts,duration:m.duration,pos:m.pos,name:m.name,spriteTs:m.spriteTs,flip:m.flip,offset:m.offset,pending:m.queued}))
  assert.deepEqual(actual,f.mods,ctx+'/registered modifier state');checked++
 }
}
console.log(`${rows.length} original Archer A stun lifecycle cases / ${checked} frames: same-template refresh, independent rank/hero counts, exact expiry/death/removal, bans/boss/ignore-stun and aliased positions/offsets match`)
