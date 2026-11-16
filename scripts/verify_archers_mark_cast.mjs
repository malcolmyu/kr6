import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/archers-mark-cast-oracle.json');let frames=0
for(const {level,birth,kind,frames:trace,events:expected}of rows){
 const site={id:'test',tower:'tower_archers_lvl4',pos:{x:500,y:350},powerLevels:{skill_c:0}},pos={x:600,y:400},e={id:1,hp:1000,template:structuredClone(templates.enemy_bandit),path:{position:pos,direction:{x:1,y:0},remainingNodes:100,finished:false}},c=new RangedCombat(templates,()=>.5,()=>{}),events=[]
 c.deferArcherControllers=true;let tick
 c.archerMarkCaster.onEagle=(name,enemy)=>events.push({tick,name,pos:{...enemy.path.position}})
 c.archerMarkCaster.onMark=(_enemy,level)=>events.push({tick,name:'mod_archers_skill_c_weak',level,pos:{x:0,y:0}})
 c.onSound=sound=>events.push({tick,sound})
 for(const [i,f]of trace.entries()){
  const relative=i+1;tick=f.tick;const time=tick*(1/30)
  if(relative===20)site.powerLevels.skill_c=level
  if(kind==='upgrade'&&relative===25&&level<3)site.powerLevels.skill_c=level+1
  site.towerBlocked=(kind==='blocked'&&relative>=15&&relative<75)||(kind==='blocked-cast'&&relative>=25&&relative<75)
  e.hp=kind==='low-hp'?49:kind==='lost'&&relative>=25?0:1000
  if(kind==='moving')pos.x=600+relative*.01;if(kind==='out-of-range')pos.x=1000
  const pool=kind==='empty'||kind==='late'&&relative<80?[]:[e]
  c.advance(time,[site],pool)
  const state=c.shooters.get(site.id),ctx=`${level}/${birth}/${kind}/${relative}`
  // Before C is purchased, the existing normal archer path is independently covered.
  if(relative>=20&&!site.towerBlocked){assert.equal(state.archerTs,f.basicTs,ctx+'/basic timestamp');assert.equal(c.archerMarkCaster.states.get(site.id)?.ts,f.markTs,ctx+'/mark timestamp')}
  const actual=[...state.archers.values()].map(child=>{const pending=child.pending;child.pending=false;return pending})
  if(relative>=20)assert.deepEqual(actual,f.children,ctx+'/independent child triggers')
  frames++
 }
 assert.deepEqual(events,expected,`${level}/${birth}/${kind}/cast events`)
}
console.log(`${rows.length} original mark cast traces / ${frames} frames: eagle/sound/windup/modifier, captured target/latest level, empty retry, HP threshold/range, blocked tower and independent child shooting clocks match`)
