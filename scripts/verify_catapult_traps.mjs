import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {catapultTrapPositions} from '../src/game/CatapultTrapPlacement.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),maps=[1,2,3].map(i=>read(`public/data/level0${i}.json`))
const rows=read('analysis/catapult-trap-positions-oracle.json')
for(const r of rows){const candidates=catapultTrapPositions(maps[r.stage-1],r.pos,r.mines.map(m=>m.pos));assert.deepEqual(candidates,r.candidates,JSON.stringify({stage:r.stage,pos:r.pos,mines:r.mines}));assert.deepEqual(candidates[Math.floor(r.rng*candidates.length)],r.selected)}
console.log(`${rows.length} original trap placement cases match all ordered subpaths, duplicate weights, strict range, visible active nodes, LAND-only cells and spacing`)

const {CatapultTowerSystem,catapultDirection}=await import('../src/game/CatapultTower.ts')
let sourceFrames=0
for(const row of read('analysis/catapult-trap-tower-oracle.json')){
 const sys=new CatapultTowerSystem(templates),site={id:'source',tower:'tower_catapult_lvl4',pos:{x:500,y:350},powerLevels:{skill_c:row.initialLevel,...(row.scenario===16?{skill_a:1,skill_b:1}:{})}},events=[],calls=[],choices=[]
 let tick=0,time=row.birth*(1/30),input=row.frames[0]
 const find=(_site,seconds,direction)=>{const pos={x:620,y:470},found=row.scenario===16&&(direction===undefined||catapultDirection({x:500,y:362},pos)===direction);calls.push({at:time,pred:seconds,filter:direction!==undefined,target:found});return found?{target:{id:1,pos,predict:()=>({...pos})},pos:{...pos}}:undefined}
 sys.trapCount=()=>input.trapCount
 sys.findTrapPosition=()=>{const points=row.scenario===12&&tick<91?[]:[{x:600,y:350},{x:580,y:390},{x:450,y:350}].filter(p=>!input.mines.some(m=>(m.x-p.x)**2+(m.y-p.y)**2<=2500));choices.push({at:time,points});return points[Math.floor(.5*points.length)]}
 sys.onShoot=(_site,name,pos,to,factor,at,level)=>events.push({at,name,pos,to,factor,level});sys.insert(site,time,find)
 for(const expected of row.frames){tick++;time=(row.birth+tick)*(1/30);input=expected;site.powerLevels.skill_c=expected.power;site.towerBlocked=expected.blocked;sys.waveGroupNumber=expected.wave;if(row.scenario===17&&tick===181)sys.resetSkillCooldowns(site,time);sys.advance(time,[site],find)
  const s=sys.states.get(site.id),ctx=`source${row.birth}/${row.scenario} tick${tick}`
  for(const key of ['attackTs','tarTs','explosiveTs','trapTs','groupTs']){if(expected[key]===undefined)assert.equal(s[key],undefined,ctx+' '+key);else assert(Math.abs(s[key]-expected[key])<1e-10,ctx+' '+key+': '+s[key]+' != '+expected[key])}
  for(const [index,p]of s.parts.entries()){const n=expected.parts[index];for(const key of ['name','flip','loop','runs'])assert.equal(p[key],n[key],ctx+' part'+index+' '+key);assert(Math.abs(p.ts-n.ts)<1e-10,ctx+' part'+index+' ts')}
  sourceFrames++
 }
 assert.equal(events.length,row.events.length,`source${row.scenario} shots`)
 for(const [i,e]of events.entries()){const n=row.events[i];for(const k of ['name','pos','to','factor','level'])assert.deepEqual(e[k],n[k],`source${row.scenario} event${i} ${k}`);assert(Math.abs(e.at-n.at)<1e-10)}
 for(const [actual,native]of [[calls,row.calls],[choices,row.choices]]){assert.equal(actual.length,native.length,`source${row.scenario} calls`);for(const [i,c]of actual.entries()){const n=native[i];assert(Math.abs(c.at-n.at)<1e-10);for(const k of Object.keys(c).filter(k=>k!=='at'))assert.deepEqual(c[k],n[k])}}
}
console.log(`${sourceFrames} original C tower frames match loader cast, native checkpoint and shared basic/ammo gates, ranks, wave/block/capacity/no-position retry and Royal reset`)

const {CatapultTraps}=await import('../src/game/CatapultTraps.ts'),{PathFollower}=await import('../src/game/PathFollower.ts'),{stunEnemy}=await import('../src/game/EnemyModifiers.ts')
let effectFrames=0
for(const row of read('analysis/catapult-trap-effects-oracle.json')){
 const template=structuredClone(templates.enemy_bandit);if(row.mode===5)template.vis.flags|=128;if(row.mode===6)template.vis.bans|=8;if(row.mode===7)template.vis.bans|=4194308;if(row.mode===8){template.vis.flags|=32;template.health.armor=.5}if(row.mode===9)template.unit.ignore_stun=true
 const e={id:1,hp:row.mode===15?15:5000,template,path:new PathFollower([{x:row.mode===2?900:600,y:350},{x:1500,y:350}])},source={id:'source',tower:'tower_catapult_lvl4',pos:{x:500,y:350}},system=new CatapultTraps(templates,()=>.5,()=>{}),damages=[],queued=[],sounds=[];let time=0,foreignAt,foreignPending=false
 system.onSound=name=>sounds.push({at:time,name});system.onDamage=(_e,value,at)=>damages.push({at,value,type:2});system.onQueueStun=(_e,level,at)=>queued.push({at,level,name:'mod_catapult_skill_c_stun'});system.queue({x:600,y:350},row.level,'source:0')
 for(const [i,n]of row.frames.entries()){
  const tick=i+1;time=(row.birth+tick)*(1/30);const ctx=`trap${row.birth}/${row.level}/${row.mode} tick${tick}`
  if(row.mode===2&&tick===61)e.path=new PathFollower([{x:600,y:350},{x:1500,y:350}])
  if(row.mode===3&&tick===20)e.path=new PathFollower([{x:900,y:350},{x:1500,y:350}])
  if(row.mode===4&&tick===20)e.hp=0
  if(row.mode===6&&tick===61)e.template.vis.bans&=~8
  if(row.mode>=10&&row.mode<=12&&tick===31)system.queue({x:600,y:350},row.mode===10?row.level:row.mode===11?Math.min(3,row.level+1):Math.max(1,row.level-1),'source:0')
  if(row.mode===16){if(tick===1){stunEnemy(e,1);foreignAt=time}if(foreignPending){stunEnemy(e,-1);foreignAt=undefined;foreignPending=false}if(foreignAt!==undefined&&time-foreignAt>=5)foreignPending=true}
  system.advance(time,row.mode===14||row.mode===13&&tick>=5?[]:[source],[e])
  assert.equal(e.hp,n.hp,ctx+' hp');assert.equal(e.template.unit.stun_count,n.stunCount,ctx+' stun count');assert.equal(!!e.template.unit.is_stunned,n.stunned,ctx+' stunned');assert.equal(system.count('source:0'),n.ownerCount,ctx+' registered owner count')
  assert.equal(system.traps.length,n.traps.filter(t=>t.active).length,ctx+' visible traps')
  for(const t of system.traps){const native=n.traps.find(v=>v.key===t.id);for(const key of ['name','loop','runs','hidden','pending','level'])assert.equal(t[key],native[key],ctx+' '+key);for(const key of ['at','spriteAt'])assert(Math.abs(t[key]-native[key])<1e-10,ctx+' '+key)}
  assert.equal(system.stuns.size,n.mods.length,ctx+' modifiers')
  for(const m of system.stuns.values()){const native=n.mods[0];for(const key of ['level','duration','pending'])assert.equal(m[key],native[key],ctx+' mod '+key);for(const key of ['at','spriteAt'])assert(Math.abs(m[key]-native[key])<1e-10,ctx+' mod '+key)}
  effectFrames++
 }
 const q=row.queued.filter(q=>q.name==='mod_catapult_skill_c_stun');assert.equal(queued.length,q.length);for(const [i,a]of queued.entries()){assert.equal(a.level,q[i].level);assert(Math.abs(a.at-q[i].at)<1e-10)}
 sounds.sort((a,b)=>Math.round(a.at*1e9)-Math.round(b.at*1e9)||a.name.localeCompare(b.name));row.sounds.sort((a,b)=>Math.round(a.at*1e9)-Math.round(b.at*1e9)||a.name.localeCompare(b.name))
 for(const [a,n]of [[damages,row.damage],[sounds,row.sounds]]){assert.equal(a.length,n.length);for(const [i,item]of a.entries()){assert(Math.abs(item.at-n[i].at)<1e-10);for(const k of Object.keys(item).filter(k=>k!=='at'))assert.deepEqual(item[k],n[i][k])}}
}
console.log(`${effectFrames} original trap/stun/health frames match set/ready/activate, delayed requery and damage, queued rank-aware stuns/refcounts, source registration/sale, immune/dead/escape targets and cleanup`)

const {TowerSystem}=await import('../src/game/TowerSystem.ts'),{RangedCombat}=await import('../src/game/RangedCombat.ts'),{GameSession}=await import('../src/game/GameSession.ts')
const towers=new TowerSystem(maps[1],'campaign',templates),p=towers.sites[0];p.tower='tower_catapult_lvl4';p.spent=1000;let gold=2000
for(const [i,n]of read('analysis/catapult-trap-power-oracle.json').entries()){if(i<3)gold=towers.upgradePower(p.id,'skill_c',gold);else assert.throws(()=>towers.upgradePower(p.id,'skill_c',gold));assert.equal(gold,n.gold);assert.equal(p.spent,n.spent);assert.equal(p.powerLevels.skill_c,n.level)}
for(const r of read('analysis/catapult-trap-impact-oracle.json')){
 const c=new RangedCombat(templates,()=>.5,()=>{}),effects=[],sounds=[];c.cellAt=()=>r.water?2:1;c.onEffect=(name,pos)=>effects.push({name,pos});c.onSound=name=>sounds.push(name)
 c.pendingCatapultShots.push({name:'bullet_catapult_skill_c',from:{x:400,y:400},to:{x:500,y:350},factor:r.factor,level:r.level,source:'sold:0'})
 let tick=0;do{c.advance(tick*(1/30),[],[]);tick++}while(c.projectiles.length&&tick<41)
 assert(Math.abs((tick-1)*(1/30)-r.impactAt)<1e-10);assert(r.damage.every(d=>d.value===0));assert.deepEqual(effects,r.effects.filter(e=>e.name!=='aura_catapult_skill_c_trap'));assert.deepEqual(sounds.slice(1),r.sounds);assert.equal(c.catapultTraps.traps.length,0)
 c.advance(tick*(1/30),[],[]);const trap=c.catapultTraps.traps[0];assert.equal(trap.level,r.level);assert.equal(trap.owner,undefined,'source sold before landing never registers orphan trap on a new tower')
}
const program={format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]},g=new GameSession(maps[1],program,templates,()=>.5),site=g.towers.sites.find(s=>s.id==='8');site.tower='tower_catapult_lvl4';site.spent=1000;g.gold=2000;g.upgradeTowerPower(site.id,'skill_c')
for(let i=0;i<120;i++)g.advance(1/30);assert.equal(g.combat.catapultTraps.traps.length,0,'no pre-wave traps');g.callNextWave()
for(let i=0;i<1000;i++)g.advance(1/30)
const active=g.combat.catapultTraps.traps;assert.equal(active.length,3,'rank1 reaches native cap');assert.equal(g.combat.catapultTraps.count(site),3)
for(const a of active){assert(catapultTrapPositions(maps[1],site.pos,[]).some(p=>p.x===a.pos.x&&p.y===a.pos.y));for(const b of active)if(a!==b)assert((a.pos.x-b.pos.x)**2+(a.pos.y-b.pos.y)**2>2500)}
const state=g.combat.catapultTowers.states.get(site.id),basicTs=state.attackTs;g.powers.royal.onResetSkills(site);assert(state.trapTs<-1e90);assert.equal(state.attackTs,basicTs)
const pos={...active[0].pos};g.towers.sites.forEach(s=>s.attackDisabled=true);g.spawnCinematicEnemy('enemy_bandit',1,pos);const enemy=g.enemies.at(-1);enemy.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);enemy.hp=5000;enemy.template.motion.max_speed=60;enemy.skillLocked=true
for(let i=0;i<30&&!enemy.template.unit.is_stunned;i++)g.advance(1/30)
assert(enemy.template.unit.is_stunned);assert.equal(enemy.hp,4975);enemy.skillLocked=false;const start={...enemy.path.position};for(let i=0;i<15;i++)g.advance(1/30);assert.deepEqual(enemy.path.position,start,'actual path stops while stunned')
for(let i=0;i<50;i++)g.advance(1/30);assert(!enemy.template.unit.is_stunned);assert(enemy.path.position.x>start.x,'actual path resumes after stun removal')
console.log('Native C costs/max,12 bomb land/water impacts and actual GameSession wave gate, capacity/spacing/terrain, Royal reset, health, path stop/resume and sold-source orphan payload verified')
