import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {WizardTowerSystem} from '../src/game/WizardTower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),times=read('public/data/wizard-exo-times.json'),oracles=read('analysis/wizard-tower-oracle.json');let frames=0
for(const oracle of oracles){const site={id:'source',tower:`tower_wizard_lvl${oracle.level}`,pos:{x:500,y:350}},first={id:'first',pos:{x:600,y:350}},second={id:'second',pos:{x:oracle.kind==='pair-boundary'?650:610,y:oracle.kind==='pair-boundary'?350:360}},system=new WizardTowerSystem(templates,times,()=>oracle.kind==='pair-other-choice'?.75:.25),events=[]
 system.onShoot=(site,name,from,target,sign,time)=>events.push({at:time,name,pos:from,to:{...target.pos},factor:1,target:target.id,angle:Math.PI/2-Math.PI/4*sign,velocity:{x:100*sign,y:300}})
 for(let relative=1;relative<=oracle.frames.length;relative++){
  if(oracle.kind==='move-during-charge')first.pos.y=relative>=16?380:350
  if(oracle.kind==='blocked-during-charge')site.towerBlocked=relative>=16&&relative<62
  if(oracle.kind==='empty-move-block'){site.towerBlocked=relative>=351&&relative<411;first.pos.y=relative>=291?450:350}
  const time=(oracle.birth+relative)*(1/30);system.advance(time,[site],()=>oracle.kind==='empty-move-block'&&(relative<31||relative>=161&&relative<291||relative>=501)?[]:oracle.kind.startsWith('pair')?[first,second]:[first])
  const s=system.states.get(site.id),native=oracle.frames[relative-1],context=`${oracle.level}/${oracle.birth}/${oracle.kind}/frame${relative}`
  assert.equal(s.loading,native.loading,context+'/loading');assert(Math.abs(s.ts-native.attackTs)<1e-9,context+`/ts ${s.ts}/${native.attackTs}`);assert(Math.abs(s.bobTime-native.bobTime)<1e-9,context+'/bobTime')
  for(let i=0;i<s.parts.length;i++){const p=s.parts[i],n=native.parts[i];assert.equal(p.name,n.name,context+`/part${i}/name`);assert.equal(p.flip,n.flip,context+'/flip');assert.equal(p.loop,n.loop,context+'/loop');for(const [key,x,y]of [['ts',p.ts,n.ts],['x',p.offset.x,n.offset.x],['y',p.offset.y,n.offset.y]])assert(Math.abs(x-y)<1e-8,context+`/part${i}/${key} ${x}/${y}`)}frames++
 }
 assert.equal(events.length,oracle.events.length,`${oracle.level}/${oracle.kind}/event count`);for(let i=0;i<events.length;i++)for(const key of Object.keys(events[i])){const a=events[i][key],b=oracle.events[i][key];if(typeof a==='number')assert(Math.abs(a-b)<1e-9,`event${i}/${key}`);else if(typeof a==='object')for(const k of Object.keys(a))assert(Math.abs(a[k]-b[k])<1e-9,`event${i}/${key}/${k}`);else assert.equal(a,b)}
}
console.log(`${frames} native wizard basic coroutine frames match across all four levels/births: strict cooldown/retry, start/loop/end, two waits, retained pair targets, blocking, facing and bob offsets; target selection isolated; original animation_db.fni completion`)
// Exercise the actual combat dispatch, not just the isolated controller.
const {RangedCombat}=await import('../src/game/RangedCombat.ts'),{PathFollower}=await import('../src/game/PathFollower.ts')
const site=()=>({id:'wizard',tower:'tower_wizard_lvl1',pos:{x:500,y:350},spent:100}),enemy=()=>({id:1,hp:5000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:600,y:350},{x:1100,y:350}])})
{
 const s=site(),e=enemy(),combat=new RangedCombat(templates,()=>.25,()=>{}),seen=new Set(),launches=[]
 for(let tick=1;tick<=660;tick++){const time=tick*(1/30);combat.advance(time,[s],[e]);for(const p of combat.projectiles)if(!seen.has(p.id)){seen.add(p.id);launches.push({at:p.born,name:p.name,from:p.from})}}
 const native=oracles.find(o=>o.level===1&&o.birth===0&&o.kind==='continuous').events
 assert.equal(launches.length,native.length)
 for(let i=0;i<launches.length;i++){const expected=(Math.round(native[i].at*30)+1)*(1/30);assert.equal(launches[i].at,expected,'normal bolt inserts on the tick after the original coroutine queues it');assert.equal(launches[i].name,native[i].name);assert.deepEqual(launches[i].from,native[i].pos)}
}
const firstQueueTick=Math.round(oracles.find(o=>o.level===1&&o.birth===0&&o.kind==='continuous').events[0].at*30)
for(const removeTarget of [false,true]){
 const s=site(),e=enemy(),combat=new RangedCombat(templates,()=>.25,()=>{})
 for(let tick=1;tick<=firstQueueTick;tick++)combat.advance(tick*(1/30),[s],[e])
 assert.equal(combat.projectiles.length,0,'first bolt is still pending at native queue time')
 combat.advance((firstQueueTick+1)*(1/30),[],removeTarget?[]:[e])
 assert.equal(combat.projectiles.length,removeTarget?0:1,removeTarget?'original bolt insert rejects a removed target':'queued bolt survives source sale')
 assert.equal(combat.wizardTowers.states.size,0,'sold source coroutine is removed')
}
console.log('Actual wizard dispatch matches native queued shot times and origins, next-tick bolt insertion, source-sale continuation and removed-target rejection')
