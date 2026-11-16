import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CatapultTowerSystem,catapultDirection} from '../src/game/CatapultTower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/catapult-explosive-oracle.json')
let frames=0
for(const row of rows){
 const sys=new CatapultTowerSystem(templates),site={id:'catapult',tower:'tower_catapult_lvl4',pos:{x:500,y:350},powerLevels:{skill_b:row.initialLevel}},events=[],calls=[];let tick=0,time=row.birth*(1/30),pos={x:620,y:470}
 const find=(_site,seconds,direction)=>{
  const origin={x:500,y:362},unavailable=row.scenario===11&&(tick<70||tick>=250&&tick<360),found=!unavailable&&(direction===undefined||catapultDirection(origin,pos)===direction)&&(pos.x-origin.x)**2+(pos.y-origin.y)**2/(.7*.7)<=300**2
  calls.push({at:time,pred:seconds,filter:direction!==undefined,target:found});return found?{target:{id:1,pos,predict:()=>({...pos})},pos:{...pos}}:undefined
 }
 sys.onShoot=(_site,name,pos,to,factor,at,level)=>events.push({name,pos,to,factor,at,level});sys.insert(site,time,find)
 for(const expected of row.frames){
  tick++;time=(row.birth+tick)*(1/30);pos=expected.pos;site.towerBlocked=expected.blocked;site.powerLevels.skill_b=expected.power;sys.advance(time,[site],find)
  const state=sys.states.get(site.id),context=`scenario${row.scenario}/birth${row.birth}/tick${tick}`
  for(const [key,native]of [['attackTs',expected.attackTs],['explosiveTs',expected.explosiveTs]])assert(Math.abs(state[key]-native)<1e-10,`${context} ${key}: ${state[key]} != ${native}`)
  for(const [index,part]of state.parts.entries()){const native=expected.parts[index];assert.equal(part.name,native.name,`${context} part${index}`);assert(Math.abs(part.ts-native.ts)<1e-10,`${context} part${index} ts ${part.ts} != ${native.ts}`);assert.equal(part.loop,native.loop);assert.equal(part.flip,native.flip);assert.equal(part.runs,native.runs,`${context} part${index} runs`)}
  frames++
 }
 assert.equal(events.length,row.events.length,`scenario${row.scenario} event count`)
 for(const [i,e]of events.entries()){const native=row.events[i];for(const key of ['name','pos','to','factor','level'])assert.deepEqual(e[key],native[key],`scenario${row.scenario} event${i} ${key}`);assert(Math.abs(e.at-native.at)<1e-10)}
 assert.equal(calls.length,row.calls.length,`scenario${row.scenario} calls`)
 for(const [i,c]of calls.entries()){const native=row.calls[i];assert(Math.abs(c.at-native.at)<1e-10,`scenario${row.scenario} call${i} ts`);assert.equal(c.pred,native.pred);assert.equal(c.filter,native.filter);assert.equal(c.target,native.target)}
}
console.log(`${frames} native catapult explosive script frames match: three ranks, purchases during each animation phase, blocked purchase, rank changes, same-quadrant requery, retry and native tower/loader/balls animations`)

const {CatapultBombSystem}=await import('../src/game/CatapultBomb.ts'),{PathFollower}=await import('../src/game/PathFollower.ts')
let bombFrames=0
for(const row of read('analysis/catapult-bomb-oracle.json')){
 const enemies=[[0,0],[35,0],[70,0],[70.001,0],[0,49],[0,48.999],[30,20],[0,0],[0,0],[0,0],[0,0]].map(([x,y],index)=>{
  const template=structuredClone(templates.enemy_bandit);if(index===7)template.vis.flags|=128;if(index===8)template.vis.bans|=8;if(index===9)template.health.armor=.5;template.health.hp_max=5000
  return{id:index+1,template,hp:index===10?0:5000,path:new PathFollower([{x:500+x,y:350+y},{x:1500,y:350+y}])}
 }),bombs=new CatapultBombSystem(templates.aura_catapult_skill_b_bomb,()=>{}),sounds=[],damages=[]
 bombs.onSound=name=>sounds.push({at:time,name});bombs.onDamage=(e,value,at)=>damages.push({at,target:e.id,value,type:8});bombs.queue({x:500,y:350},row.level)
 let time=row.birth*(1/30)
 for(const [index,expected]of row.frames.entries()){
  const tick=index+1;time=(row.birth+tick)*(1/30)
  if(row.mode===2&&tick===6){enemies[0].path=new PathFollower([{x:600,y:350},{x:1500,y:350}]);enemies[3].path=new PathFollower([{x:500,y:350},{x:1500,y:350}])}
  if(row.mode===3&&tick===8)enemies[1].hp=0
  bombs.advance(time,enemies);const b=bombs.bombs[0],ctx=`bomb${row.level}/${row.birth}/${row.mode} tick${tick}`
  assert.equal(!!b,expected.active,ctx+' visibility')
  if(b){assert.equal(b.name,expected.name,ctx+' animation');assert.equal(b.loop,expected.loop);assert.equal(b.removeNext,expected.pending);assert(Math.abs(b.spriteAt-expected.spriteAt)<1e-10);assert.equal(b.runs,expected.runs,ctx+' runs')}
  assert.deepEqual(enemies.map(e=>e.hp),expected.hp,ctx+' actual HP');bombFrames++
 }
 assert.equal(sounds.length,row.sounds.length);for(const [i,s]of sounds.entries()){assert.equal(s.name,row.sounds[i].name);assert(Math.abs(s.at-row.sounds[i].at)<1e-10)}
 damages.sort((a,b)=>a.at-b.at||a.target-b.target);row.damages.sort((a,b)=>a.at-b.at||a.target-b.target)
 assert.equal(damages.length,row.damages.length);for(const [i,d]of damages.entries()){const n=row.damages[i];assert.equal(d.target,n.target);assert.equal(d.value,n.value);assert(Math.abs(d.at-n.at)<1e-10)}
}
console.log(`${bombFrames} native delayed powerball simulation frames match queued insertion, .08s delay, activation/windup, three-rank radial falloff, actual armour/HP, movement/death, airborne/vis-banned targets, sound and animation removal`)

const {TowerSystem}=await import('../src/game/TowerSystem.ts'),{RangedCombat}=await import('../src/game/RangedCombat.ts')
const towerSystem=new TowerSystem(read('public/data/level02.json'),'campaign',templates),purchaseSite=towerSystem.sites[0];purchaseSite.tower='tower_catapult_lvl4';purchaseSite.spent=1000
let gold=2000
for(const [i,native]of read('analysis/catapult-power-oracle.json').entries()){if(i<3)gold=towerSystem.upgradePower(purchaseSite.id,'skill_b',gold);else assert.throws(()=>towerSystem.upgradePower(purchaseSite.id,'skill_b',gold));assert.equal(gold,native.gold);assert.equal(purchaseSite.spent,native.spent);assert.equal(purchaseSite.powerLevels.skill_b,native.level)}
assert.equal(towerSystem.refund(purchaseSite,1),960)
for(let level=1;level<=3;level++){
 const combat=new RangedCombat(templates,()=>.5,()=>{}),site={id:'source',pos:{x:500,y:350},tower:'tower_catapult_lvl4',damageFactor:1.75,powerLevels:{skill_b:level}},pos={x:620,y:470},enemies=[0,1,2].map(i=>{
  const template=structuredClone(templates.enemy_bandit);template.motion.max_speed=0;if(i===1)template.vis.bans|=8
  return{id:i+1,hp:1000,template,path:new PathFollower([{x:pos.x+(i===2?65:0),y:pos.y},{x:1500,y:pos.y}])}
 }),damages=[],sounds=[];combat.catapultBombs.onDamage=(e,value,time)=>damages.push({id:e.id,value,time});combat.onSound=name=>sounds.push(name)
 let tick=1
 for(;tick<200&&!combat.projectiles.length;tick++)combat.advance(tick*(1/30),[site],enemies)
 assert.equal(combat.projectiles[0].name,'bullet_catapult_skill_b');assert.equal(combat.projectiles[0].level,level)
 // Remove the source before impact. Both the flying projectile and queued payload remain autonomous.
 for(;tick<300;tick++)combat.advance(tick*(1/30),[],enemies)
 assert.equal(combat.catapultTowers.states.size,0);assert.equal(combat.catapultBombs.bombs.length,0)
 const extra=[30,68,102][level-1];assert.equal(enemies[0].hp,1000-210-extra,'source factor affects primary hit but not payload');assert.equal(enemies[1].hp,1000-extra,'payload uses original vis0/0 even when primary explosion is banned');assert(enemies[2].hp<1000,'payload radius70 extends beyond primary radius60')
 assert(damages.every(d=>d.value<=extra));assert(sounds.includes('TowerRoyalCatapultPowerballExplosion'))
}
console.log('Native catapult B prices/refunds/max state and actual queued RangedCombat impacts verified: all ranks, source sale, captured primary1.75 factor, independent second explosion, radius70 and original0/0 visibility')
