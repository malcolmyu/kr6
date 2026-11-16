import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {WizardTowerSystem} from '../src/game/WizardTower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),times=read('public/data/wizard-exo-times.json'),rows=read('analysis/wizard-copies-tower-oracle.json')
let frames=0
for(const row of rows){
 const {kind,level,birth}=row,site={id:'source',tower:'tower_wizard_lvl4',pos:{x:500,y:350},powerLevels:{skill_c:kind==='purchase-during-basic'?0:kind==='upgrade-windup'?1:level}},target={id:1,pos:{x:600,y:350},hitOffset:templates.enemy_bandit.unit.hit_offset},system=new WizardTowerSystem(templates,times,()=>.25),events=[]
 let time
 system.onSound=sound=>events.push({at:time,sound})
 system.onShoot=(_site,name,pos,t)=>{const b=templates[name].bullet;events.push({at:time,name,pos,to:{...t.pos},min:b.damage_min,max:b.damage_max,level:b.level})}
 system.onCopies=(_site,name,pos,to,_id,level,min,max)=>events.push({at:time,name,pos,to:{...to},min,max,level})
 for(let relative=1;relative<=row.frames.length;relative++){
  time=(birth+relative)*(1/30)
  if(kind==='move-start')target.pos.y=relative>=8?500:350
  if(kind==='blocked-start')site.towerBlocked=relative>=8&&relative<55
  if(kind==='purchase-during-basic'){if(relative===40)site.powerLevels.skill_c=1;if(relative===48)site.powerLevels.skill_c=level}
  if(kind==='upgrade-windup'&&relative===20)site.powerLevels.skill_c=level
  system.advance(time,[site],(_site,index=0)=>kind==='only-copies'&&index!==3||kind==='no-copy-target'&&index===3||kind==='empty-window'&&(relative<101||relative>=201&&relative<301)?[]:[target])
  const s=system.states.get(site.id),n=row.frames[relative-1],context=`${level}/${birth}/${kind}/${relative}`
  assert.equal(s.loading,n.loading,context+'/loading')
  for(const [a,b]of [[s.ts,n.attackTs],[s.bookTs,n.bookTs],[s.bobTime,n.bobTime]])assert(Math.abs(a-b)<1e-8,context+`/clock ${a}/${b}`)
  for(const [i,p]of s.parts.entries()){const q=n.parts[i];assert.equal(p.name,q.name,context+`/part${i}`);assert.equal(p.flip,q.flip,context+'/flip');assert.equal(p.loop,q.loop,context+'/loop');for(const [a,b]of [[p.ts,q.ts],[p.offset.x,q.offset.x],[p.offset.y,q.offset.y]])assert(Math.abs(a-b)<1e-8,context+`/part${i} ${a}/${b}`)}
  frames++
 }
 assert.equal(events.length,row.events.length,`${level}/${birth}/${kind}/events`)
 for(const [i,e]of events.entries())for(const key of Object.keys(e)){const a=e[key],b=row.events[i][key];if(typeof a==='number')assert(Math.abs(a-b)<1e-8,`${kind}/${i}/${key} ${a}/${b}`);else if(a&&typeof a==='object')for(const k of Object.keys(a))assert(Math.abs(a[k]-b[k])<1e-8);else assert.equal(a,b,`${kind}/${i}/${key}`)}
}
console.log(`${rows.length} original wizard C/basic cases / ${frames} frames: cast/retry/min cooldowns, purchase/upgrade during charge, animation/facing/bob, blocking and original bullet payloads`)

