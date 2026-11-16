import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GeraldSkills,geraldBuffPose} from '../src/game/GeraldSkills.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {soldierHealth,damageSoldier} from '../src/game/SoldierHealth.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
const make=()=>{const barracks=new BarracksCombat(templates,()=>.5,()=>{}),heroes=new HeroSystem(templates,barracks);return {barracks,heroes,hero:heroes.insertGerald({x:500,y:350},0),skills:heroes.geraldSkills}}
let frames=0
for(const row of read('analysis/gerald-buffs-oracle.json')){
 const {hero,skills,barracks}=make(),kind=row.name.endsWith('_a')?'skill_a':'skill_b'
 skills.apply(kind,hero,0)
 for(const sample of row.frames){
  const time=Math.round(sample.time*30)/30;skills.advance(time,hero,barracks.soldiers)
  const buff=[...skills.buffs.values()][0],health=soldierHealth(hero)
  assert.equal(!buff,sample.done)
  for(const [key,expected]of [['armor',sample.armor],['magic_armor',sample.magic],['spiked_armor',sample.spiked]])assert(Math.abs(health[key]-expected)<1e-10,`${row.name} ${time} ${key}`)
  if(buff){const pose=geraldBuffPose(buff,time);assert.equal(pose.name,sample.animation);assert(Math.abs(pose.age-(time-sample.ts))<1e-10);assert.equal(buff.kind==='skill_b'&&buff.endingAt!==undefined,sample.fade)}frames++
 }
}
// Add/remove above the armour cap preserves the remaining independent contribution.
{
 const {hero,skills,barracks}=make();hero.template.health.armor=.8
 skills.apply('skill_a',hero,0);skills.apply('skill_b',hero,0);assert.equal(soldierHealth(hero).armor,1)
 for(let frame=0;frame<=132;frame++)skills.advance(frame/30,hero,barracks.soldiers)
 assert.equal(soldierHealth(hero).armor,1);assert.equal(hero.buffs.size,1)
 for(let frame=133;frame<=210;frame++)skills.advance(frame/30,hero,barracks.soldiers)
 assert.equal(soldierHealth(hero).armor,.8);assert.equal(hero.buffs.size,0)
}
// Raw value 11 reflects ceil(11*.3)=4 despite armour, even if a different enemy fires it.
{
 const {hero,skills}=make();skills.apply('skill_b',hero,0)
 const target={id:50,hp:100,template:structuredClone(templates.enemy_bandit)};hero.target=target
 const hp=hero.hp;damageSoldier(hero,{value:11,damage_type:2},1)
 assert.equal(hp-hero.hp,8);assert.equal(target.hp,96)
 damageSoldier(hero,{value:11,damage_type:64},2);assert.equal(target.hp,96,'Spikes never reflect spikes')
 hero.hp=1;let kills=0;target.hp=2
 damageSoldier(hero,{value:11,damage_type:2},3,()=>kills++)
 assert.equal(kills,1);assert.equal(hero.target,undefined);assert.equal(target.diedAt,3)
}
// Captured targets, 20/30 cast delay, original animation lock and skill XP.
{
 const {hero,skills,barracks}=make();skills.configure(['hero_gerald_skill_a'])
 const ally=barracks.insertHero('hero_zefira',{x:530,y:350},0,structuredClone(templates.hero_zefira));ally.hp=100;ally.target={hp:100}
 const sounds=[],fx=[];skills.onSound=n=>sounds.push(n);skills.onEffect=n=>fx.push(n)
 skills.advance(0,hero,barracks.soldiers);assert(!hero.scriptLocked)
 skills.advance(1/30,hero,barracks.soldiers);assert.equal(hero.visualOverride.name,'inspire_courage')
 ally.pos.x=1000
 for(let i=2;i<=20;i++)skills.advance(i/30,hero,barracks.soldiers)
 assert.equal(ally.buffs,undefined)
 skills.advance(21/30,hero,barracks.soldiers);assert.equal(ally.buffs.size,1);assert.equal(hero.xpQueued,16)
 for(let i=22;i<=57;i++)skills.advance(i/30,hero,barracks.soldiers)
 assert.equal(hero.scriptLocked,false);assert.deepEqual(sounds,['HeroGeraldInspireCourageCast']);assert.deepEqual(fx,['decal_gerald_skill_a','fx_gerald_skill_a'])
}
// Actual enemy melee applies the shield modifier, then reflected damage and the regular reward callback.
{
 const {hero,skills,barracks}=make();skills.apply('skill_b',hero,0)
 const enemy={id:50,born:0,hp:2,age:0,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:530,y:350},{x:900,y:350}])}
 enemy.template.melee.attacks[0]={...enemy.template.melee.attacks[0],damage_min:11,damage_max:11,hit_time:0,hit_times:undefined};hero.target=enemy;hero.readyAt=1000
 let kills=0;barracks.onKill=()=>kills++
 // Place at the native melee goal so no movement postpones the first attack.
 for(let i=0;i<60&&enemy.hp>0;i++)barracks.advance(i/30,1/30,[],[enemy])
 assert.equal(kills,1);assert.equal(enemy.hp,-2)
}
console.log(`Gerald A/B: ${frames} native buff lifecycle frames, raw stacked armour, reflection with lethal hits, captured-target casting and actual melee integration verified`)

// Execute the original hero update coroutine (melee helper isolated) and compare both complete cast cycles.
for(const row of read('analysis/gerald-casts-oracle.json')){
 const {hero,skills,barracks}=make();skills.configure([`hero_gerald_${row.kind}`]);hero.target={hp:100}
 const ally=barracks.insertHero('hero_zefira',{x:530,y:350},0,structuredClone(templates.hero_zefira));ally.hp=100;ally.target={hp:100}
 for(const sample of row.frames){const time=Math.round(sample.at*30)/30;skills.advance(time,hero,barracks.soldiers);assert.equal(hero.visualOverride?.name??'idle',sample.name,`${row.kind} native cast frame ${time}`);assert.equal(hero.xpQueued,sample.xp,`${row.kind} native XP ${time}`)}
}
console.log('1802 original hero update frames match both skill cast animations, XP timing and repeat cooldown cycles')

// Tower upgrades create replacement soldiers; the old modifier cannot buff that new entity.
{
 const barracks=new BarracksCombat(templates,()=>.5,()=>{}),skills=new GeraldSkills(templates),site={id:'tower',tower:'tower_knights_lvl1',pos:{x:500,y:350},rally:{x:500,y:350}}
 barracks.advance(0,1/30,[site],[]);barracks.advance(1,1/30,[site],[])
 const old=barracks.soldiers[0];skills.apply('skill_a',old,1);assert.equal(old.buffs.size,1)
 site.tower='tower_knights_lvl2';barracks.upgradeSite(site)
 assert(!barracks.soldiers.includes(old));assert.equal(barracks.soldiers[0].buffs,undefined)
 skills.advance(1.2,undefined,barracks.soldiers);skills.advance(1.6,undefined,barracks.soldiers);assert.equal(skills.buffs.size,0)
}

// Dying during the wind-up cancels XP/buffs and releases the script lock for respawn.
{
 const {hero,skills,barracks}=make();skills.configure(['hero_gerald_skill_b']);hero.target={hp:100}
 skills.advance(0,hero,barracks.soldiers);skills.advance(1/30,hero,barracks.soldiers);assert(hero.scriptLocked)
 hero.hp=0;skills.advance(2/30,hero,barracks.soldiers)
 assert.equal(hero.scriptLocked,false);assert.equal(hero.visualOverride,undefined);assert.equal(hero.xpQueued,0);assert.equal(skills.buffs.size,0)
}
