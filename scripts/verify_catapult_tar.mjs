import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CatapultTowerSystem,catapultDirection} from '../src/game/CatapultTower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/catapult-tar-tower-oracle.json')
let frames=0
for(const row of rows){
 const sys=new CatapultTowerSystem(templates),site={id:'catapult',tower:'tower_catapult_lvl4',pos:{x:500,y:350},powerLevels:{skill_a:row.initialLevel,skill_b:row.initialB}},events=[],calls=[];let tick=0,time=row.birth*(1/30),pos={...row.frames[0].pos}
 const find=(_site,seconds,direction)=>{
  const origin={x:500,y:362},unavailable=row.scenario===11&&(tick<70||tick>=250&&tick<360),found=!unavailable&&(direction===undefined||catapultDirection(origin,pos)===direction)&&(pos.x-origin.x)**2+(pos.y-origin.y)**2/(.7*.7)<=300**2
  calls.push({at:time,pred:seconds,filter:direction!==undefined,target:found});return found?{target:{id:1,pos,predict:()=>({...pos})},pos:{...pos}}:undefined
 }
 sys.onShoot=(_site,name,pos,to,factor,at,level)=>events.push({name,pos,to,factor,at,level});sys.insert(site,time,find)
 for(const expected of row.frames){
  tick++;time=(row.birth+tick)*(1/30);pos=expected.pos;site.towerBlocked=expected.blocked;site.powerLevels.skill_a=expected.power;site.powerLevels.skill_b=expected.bPower;sys.advance(time,[site],find)
  const state=sys.states.get(site.id),context=`scenario${row.scenario}/birth${row.birth}/tick${tick}`
  for(const [key,native]of [['attackTs',expected.attackTs],['explosiveTs',expected.explosiveTs],['tarTs',expected.tarTs]])assert(Math.abs(state[key]-native)<1e-10,`${context} ${key}: ${state[key]} != ${native}`)
  for(const [index,part]of state.parts.entries()){const native=expected.parts[index];assert.equal(part.name,native.name,`${context} part${index}`);assert(Math.abs(part.ts-native.ts)<1e-10,`${context} part${index} ts ${part.ts} != ${native.ts}`);assert.equal(part.loop,native.loop);assert.equal(part.flip,native.flip);assert.equal(part.runs,native.runs,`${context} part${index} runs`)}
  frames++
 }
 assert.equal(events.length,row.events.length,`scenario${row.scenario} event count`)
 for(const [i,e]of events.entries()){const native=row.events[i];for(const key of ['name','pos','to','factor','level'])assert.deepEqual(e[key],native[key],`scenario${row.scenario} event${i} ${key}`);assert(Math.abs(e.at-native.at)<1e-10)}
 assert.equal(calls.length,row.calls.length,`scenario${row.scenario} calls`)
 for(const [i,c]of calls.entries()){const native=row.calls[i];assert(Math.abs(c.at-native.at)<1e-10,`scenario${row.scenario} call${i} ts`);assert.equal(c.pred,native.pred);assert.equal(c.filter,native.filter);assert.equal(c.target,native.target)}
}
console.log(`${frames} native catapult tar/A+B script frames match: three ranks, purchases during each animation phase, blocked purchase, rank changes, same-quadrant requery, retry and native tower/loader/balls animations`)


const {CatapultTarSystem}=await import('../src/game/CatapultTar.ts'),{PathFollower}=await import('../src/game/PathFollower.ts')
let areaFrames=0
for(const row of read('analysis/catapult-tar-areas-oracle.json')){
 const enemies=[[0,0],[60,0],[60.001,0],[0,42],[0,0],[0,0],[0,0],[0,0],[0,0]].map(([x,y],i)=>{
  const template=structuredClone(templates.enemy_bandit);template.motion.max_speed=60;if(i===4)template.vis.flags|=128;if(i===5)template.vis.bans|=8;if(i===6)template.motion.invulnerable=true;if(i===7)template.vis.bans|=4;if(i===8)template.vis.flags|=1024
  return {id:i+1,hp:5000,template,path:new PathFollower([{x:500+x,y:350+y},{x:1500,y:350+y}])}
 }),system=new CatapultTarSystem(templates),events=[]
 system.onQueue=(e,level,at)=>events.push({target:e.id,level,at});system.queue({x:500,y:350},row.level)
 const normalize=mods=>mods.map(m=>({target:m.target??m.enemy.id,level:m.level,factor:m.factor,at:m.at,pending:m.pending})).sort((a,b)=>a.target-b.target||a.level-b.level)
 for(const [i,n]of row.frames.entries()){
  const tick=i+1,time=(row.birth+tick)*(1/30),ctx=`tar${row.birth}/${row.level}/${row.mode} tick${tick}`
  if(row.mode===2)enemies[0].path=new PathFollower([{x:tick>=31&&tick<61?900:500,y:350},{x:1500,y:350}])
  if(row.mode===3&&tick===31)enemies[0].hp=0
  if(row.mode===4)enemies[0].template.vis.bans=tick<31?8:0
  if(row.mode>=5&&row.mode<=7&&tick===31)system.queue({x:500,y:350},row.mode===5?row.level:row.mode===6?Math.min(3,row.level+1):Math.max(1,row.level-1))
  if(row.mode===8&&(tick===31||tick===61))enemies[0].template.motion.max_speed*=tick===31?.4:2.5
  system.advance(time,enemies)
  for(const [i,e]of enemies.entries())assert(Math.abs(e.template.motion.max_speed-n.speeds[i])<1e-9,ctx+' speed target'+e.id)
  const actual=normalize([...system.slows.values()]),expected=normalize(n.mods);assert.equal(actual.length,expected.length,ctx+' modifiers')
  for(const [index,m]of actual.entries()){const e=expected[index];for(const key of ['target','level','pending'])assert.equal(m[key],e[key],ctx+' '+key);for(const key of ['factor','at'])assert(Math.abs(m[key]-e[key])<1e-10,ctx+' '+key)}
  assert.equal(system.areas.length,n.areas.filter(a=>a.active).length,ctx+' visible areas')
  for(const a of system.areas){const e=n.areas.find(e=>e.key===a.id);assert.equal(a.level,e.level);assert.equal(a.pending,e.pending,ctx+' pending');for(const key of ['at','spriteAt','alpha'])assert(Math.abs(a[key]-e[key])<1e-8,ctx+' '+key+': '+a[key]+' != '+e[key]);assert.equal(a.fadeAt!==undefined,e.fadeAt!==undefined,ctx+' fading');if(e.fadeAt!==undefined)assert(Math.abs(a.fadeAt-e.fadeAt)<1e-10,ctx+' fade ts')}
  areaFrames++
 }
 const byEvent=(a,b)=>a.at-b.at||a.target-b.target||a.level-b.level;events.sort(byEvent);row.events.sort(byEvent);assert.equal(events.length,row.events.length)
 for(const [i,e]of events.entries()){assert.equal(e.target,row.events[i].target);assert.equal(e.level,row.events[i].level);assert(Math.abs(e.at-row.events[i].at)<1e-10)}
}
console.log(`${areaFrames} native tar aura/mod/tween frames match actual speed, next-tick inserts/removals, equal refresh, rank replacement/rejection, leave/return/death, visibility/motion immunity, independent speed factors and native ground fade`)

const {TowerSystem}=await import('../src/game/TowerSystem.ts'),{RangedCombat}=await import('../src/game/RangedCombat.ts')
const towers=new TowerSystem(read('public/data/level02.json'),'campaign',templates),purchase=towers.sites[0];purchase.tower='tower_catapult_lvl4';purchase.spent=1000
let gold=2000
for(const [i,native]of read('analysis/catapult-tar-power-oracle.json').entries()){if(i<3)gold=towers.upgradePower(purchase.id,'skill_a',gold);else assert.throws(()=>towers.upgradePower(purchase.id,'skill_a',gold));assert.equal(gold,native.gold);assert.equal(purchase.spent,native.spent);assert.equal(purchase.powerLevels.skill_a,native.level)}
assert.equal(towers.refund(purchase,1),780)
for(const water of [false,true])for(let level=1;level<=3;level++){
 const combat=new RangedCombat(templates,()=>.5,()=>{}),site={id:'source',pos:{x:500,y:350},tower:'tower_catapult_lvl4',damageFactor:1.75,powerLevels:{skill_a:1}},pos={x:620,y:470},template=structuredClone(templates.enemy_bandit)
 template.motion.max_speed=24;const enemy={id:1,hp:1000,template,path:new PathFollower([pos,{x:1500,y:470}])};combat.predictTarget=()=>({pos:{...pos},valid:true});combat.cellAt=()=>water?2:1
 let tick=1
 for(;tick<500&&!combat.projectiles.some(p=>p.name.startsWith('bullet_catapult_skill_a'));tick++){if(tick===5)site.powerLevels.skill_a=level;combat.advance(tick*(1/30),[site],[enemy])}
 const tar=combat.projectiles.find(p=>p.name.startsWith('bullet_catapult_skill_a'));assert.equal(tar.name,`bullet_catapult_skill_a_lvl${level}`);assert.equal(tar.level,level)
 let active=false
 for(;tick<900;tick++){
  combat.advance(tick*(1/30),[],[enemy]);if(combat.catapultTar.slows.size){active=true;assert(Math.abs(template.motion.max_speed-24*[.6,.5,.4][level-1])<1e-10)}
 }
 assert(active,'queued tar payload survives sale and inserts actual slow');assert.equal(enemy.hp,580,'initial basic and tar primary each retain1.75 source factor');assert(Math.abs(template.motion.max_speed-24)<1e-10,'expiry divides its own factor and preserves independent speed effects');assert.equal(combat.catapultTar.areas.length,0);assert.equal(combat.catapultTar.slows.size,0)
}
console.log('Original catapult A purchases/refunds/max and actual land/water impacts verified: native ammo/rank capture, source-sale survival, primary1.75 factor, queued slow and preserved independent speed factor after expiry')

for(const row of read('analysis/catapult-tar-impact-oracle.json')){
 const combat=new RangedCombat(templates,()=>.5,()=>{}),enemies=row.targets.map(e=>{
  const template=structuredClone(templates.enemy_bandit);template.vis.flags=e.flags;template.vis.bans=e.bans
  return{id:e.id,hp:1000,template,path:new PathFollower([{x:500+e.offset.x,y:350+e.offset.y},{x:1500,y:350+e.offset.y}])}
 }),effects=[],sounds=[];combat.cellAt=()=>row.water?2:1;combat.onEffect=(name,pos)=>effects.push({name,pos});combat.onSound=name=>sounds.push(name)
 combat.pendingCatapultShots.push({name:`bullet_catapult_skill_a_lvl${row.level}`,from:{x:400,y:400},to:{x:500,y:350},factor:row.factor,level:row.level})
 let tick=0
 do{combat.advance(tick*(1/30),[],enemies);tick++}while(combat.projectiles.length&&tick<41)
 assert(Math.abs((tick-1)*(1/30)-row.impactAt)<1e-10);assert.equal(combat.catapultTar.areas.length,0,'payload is queued at native impact')
 const hits=enemies.filter(e=>e.hp<1000).map(e=>({target:e.id,value:1000-e.hp,type:8}));assert.deepEqual(hits,row.damage)
 assert.deepEqual(effects,row.effects.filter(e=>e.name!=='aura_catapult_skill_a'))
 assert.deepEqual(sounds.slice(1),row.sounds,'impact audio matches original land/water branch')
 combat.advance(tick*(1/30),[],enemies);assert.equal(combat.catapultTar.areas[0].level,row.effects.find(e=>e.name==='aura_catapult_skill_a').level)
}
console.log('12 original A bomb impacts also match actual RangedCombat: all ranks, radial boundary values, normal/Royal factors, land/water FX/audio and next-tick payload rank')
