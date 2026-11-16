import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ZefiraSkills,zefiraShieldPose} from '../src/game/ZefiraSkills.ts'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {soldierHealth} from '../src/game/SoldierHealth.ts'
import {EnemyTeleport} from '../src/game/EnemyTeleport.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
const hero=()=>new HeroSystem(templates,new BarracksCombat(templates)).insert('hero_zefira',{x:500,y:350},0)
let nextId=1
const enemy=(name,x,y)=>({id:nextId++,name,hp:1000,template:structuredClone(templates[name]),path:{position:{x,y},finished:false},born:0})
let hammerFrames=0,shieldFrames=0
for(const row of read('analysis/zefira-hammer-oracle.json')){
 const h=hero(),s=new ZefiraSkills(()=>.5),events=[]
 s.configure(['skill_a',...(row.level>=2?['upg_sa1']:[]),...(row.level===3?['upg_sa2']:[])])
 h.facingLeft=row.flip
 const offsets=[[0,0],[50,0],[50.01,0],[0,35],[0,35.01],[-40,-10]]
 const enemies=offsets.map(([x,y])=>enemy('enemy_bandit',500+(row.flip?-40:40)+x,350+y));enemies.push(enemy('enemy_crow',500+(row.flip?-40:40),350))
 s.onEffect=(name,pos,time)=>events.push({name,pos,time})
 assert(s.tryHammer(h,13,enemies))
 for(const sample of row.frames){
  const time=Math.round(sample.at*30)/30;s.advance(time,h,enemies)
  assert.equal(h.visualOverride?.name??'skill_1',sample.name);assert.equal(h.xpQueued,sample.xp);assert.equal(!s.cast,sample.done)
  assert.equal(!!s.cast?.hit,sample.cooldownTs===13&&!sample.done);hammerFrames++
 }
 for(const [i,e]of enemies.entries()){
  const hit=row.damage.some(d=>d.target.name===e.name&&JSON.stringify(d.target.offset)===JSON.stringify(offsets[i]??[0,0]))
  assert.equal(1000-e.hp,hit?([0,30,60,90][row.level]):0,`${row.flip} offset ${offsets[i]}`)
 }
 assert.equal(events.length,1);assert.equal(events[0].time,13.7)
}
for(const row of read('analysis/zefira-shield-oracle.json')){
 const h=hero(),e=enemy('enemy_bandit',510,350),s=new ZefiraSkills(()=>.5),events=[]
 s.configure(['skill_b',...(row.level>=2?['upg_sb1']:[]),...(row.level===3?['upg_sb2']:[])])
 s.startShield(h,row.born);s.onEffect=(name,pos,time)=>events.push({name,time})
 for(const sample of row.frames){
  const time=Math.round(sample.at*30)/30;s.advance(time,h,[e])
  assert.equal(!s.shield,sample.done)
  assert(Math.abs(soldierHealth(h).armor-sample.armor)<1e-12)
  assert(Math.abs(soldierHealth(h).magic_armor-sample.magic)<1e-12)
  assert.equal(1000-e.hp,sample.damage*2,`${row.born}/${row.level} at ${time}`)
  if(s.shield){const pose=zefiraShieldPose(s.shield,time);assert.equal(pose.name,sample.name);assert(Math.abs(pose.age-(time-sample.ts))<1e-9)}
  shieldFrames++
 }
 assert.deepEqual(events.map(e=>Math.round(e.time*30)),row.effects.filter(e=>e.name==='fx_zefira_skill_b_hit').map(e=>Math.round(e.at*30)))
 assert.equal(e.template.motion.max_speed,templates.enemy_bandit.motion.max_speed)
}
// The check aura keeps an independent, strict cooldown from its first update.
for(const row of read('analysis/zefira-shield-check-oracle.json')){
 const h=hero(),e=enemy('enemy_bandit',510,350),s=new ZefiraSkills(()=>.5),events=[];h.born=row.born;h.target=e
 s.configure(['skill_b',...(row.cooldown<18?['upg_b']:[])]);s.onSound=name=>events.push(row.born+Math.round((currentTime-row.born)*30)/30);let currentTime
 for(const sample of row.frames){currentTime=Math.round(sample.at*30)/30;s.advance(currentTime,h,[e]);assert.equal(h.xpQueued,sample.xp)}
 assert.deepEqual(events.map(t=>Math.round(t*30)),row.events.map(e=>Math.round(e.at*30)))
}
// Native enemy coroutine aborts a pending strike when stunned, rather than catching up later.
for(const row of read('analysis/zefira-stun-interrupt-oracle.json')){
 const b=new BarracksCombat(templates,()=>.5,()=>{}),s=b.insertHero('soldier_knights_lvl1',{x:530,y:350},0,structuredClone(templates.soldier_knights_lvl1)),e=enemy('enemy_bandit',500,350),z=new ZefiraSkills()
 s.scriptLocked=true;s.target=e;e.template.melee.attacks[0].ts=-10
 for(const sample of row.frames){const time=Math.round(sample.at*30)/30;if(Math.round(time*30)===row.stunFrame)z.modifiers.stun(e,time)
  b.advance(time,1/30,[],[e]);e.template.melee.attacks[0].disabled=true;assert.equal((s.template.health.hp_max-s.hp)/2,sample.damage)
 }
}
// Interrupted pre-hit casts gain XP, leave cooldown available, and never hit.
{
 const h=hero(),e=enemy('enemy_bandit',540,350),s=new ZefiraSkills(()=>.5);s.configure(['skill_a'])
 assert(s.tryHammer(h,13,[e]));h.scriptLocked=false;h.visualOverride=undefined;s.advance(13.1,h,[e]);assert.equal(e.hp,1000);assert.equal(h.xpQueued,12)
 assert(s.tryHammer(h,13.2,[e]));assert.equal(h.xpQueued,24)
}
// The target may die before impact; the area still resolves at the hero's current location.
{
 const h=hero(),e=enemy('enemy_bandit',540,350),other=enemy('enemy_bandit',545,350),s=new ZefiraSkills(()=>.5);s.configure(['skill_a'])
 s.tryHammer(h,13,[e,other]);e.hp=0;s.advance(13.7,h,[e,other]);assert.equal(other.hp,970);assert(other.template.unit.is_stunned)
 const tp=new EnemyTeleport(templates.mod_gerald_skill_c_teleport);other.path.teleportBack=()=>{};tp.apply(other,13.7)
 s.modifiers.advance(14.7);assert(other.template.unit.is_stunned,'Teleport owns an independent stun contribution')
 for(let f=412;f<480;f++)tp.advance(f/30)
 assert.equal(!!other.template.unit.is_stunned,false)
}
// Native range queries reject invalid path nodes, independently of damage at an already cast hit.
{
 const h=hero(),e=enemy('enemy_bandit',540,350),s=new ZefiraSkills(()=>.5);s.configure(['skill_a','skill_b']);s.targetValid=()=>false
 assert.equal(s.tryHammer(h,19,[e]),false);h.target=e;s.advance(0,h,[e]);s.advance(19,h,[e]);assert.equal(s.shield,undefined)
 s.targetValid=()=>true;assert(s.tryHammer(h,19,[e]));s.targetValid=()=>false;s.advance(19.7,h,[e]);assert.equal(e.hp,970)
}
// Shared status refreshes do not compound slow or leave stale stun contributions.
{
 const h=hero(),e=enemy('enemy_bandit',510,350),s=new ZefiraSkills();const speed=e.template.motion.max_speed
 s.modifiers.slow(e,1);s.modifiers.slow(e,1.2);assert.equal(e.template.motion.max_speed,speed*.75)
 s.modifiers.advance(1.4);assert.equal(e.template.motion.max_speed,speed*.75);s.modifiers.advance(1.6);assert.equal(e.template.motion.max_speed,speed)
 s.modifiers.stun(e,2);s.modifiers.stun(e,2.2);assert.equal(e.template.unit.stun_count,1);s.modifiers.advance(3.3);assert.equal(e.template.unit.stun_count,0)
 s.configure(['skill_a','skill_b','upg_b']);assert.equal(s.cooldownA,10.8);assert.equal(s.cooldownB,16.2)
 h.target=e;s.advance(0,h,[e]);s.advance(16.2,h,[e]);assert.equal(s.shield,undefined);s.advance(16.2333333333,h,[e]);assert(s.shield);assert.equal(h.xpQueued,18)
}
console.log(`Zefira: ${hammerFrames} hammer / ${shieldFrames} shield native frames; area boundaries, interruptions, stun ownership and slow refresh passed`)
