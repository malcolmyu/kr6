import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {powerUpgradeTemplates} from '../src/game/PowerUpgrades.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {SpecialReinforcementAttack} from '../src/game/Reinforcements.ts'
import {ReinforcementAura} from '../src/game/ReinforcementAura.ts'
import {soldierHealth} from '../src/game/SoldierHealth.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
const near=(a,b,label)=>assert(Math.abs(a-b)<1e-8,`${label}: ${a} vs ${b}`)
const squads=read('analysis/reinforcement-spawn-oracle.json')
for(const row of squads){let index=0;const b=new BarracksCombat(powerUpgradeTemplates(templates,{reinforcements:row.selected}),()=>((row.variants[index++]-1)+.5)/3,()=>{});b.reinforce({x:500,y:350},0);assert.equal(b.soldiers.length,row.spawned.length)
 for(const [i,e]of row.spawned.entries()){const s=b.soldiers[i];assert.equal(s.name,e.name);assert.equal(s.prefix,e.prefix);near(s.hp,e.hp,'hp');near(s.expiresAt,e.duration,'duration');for(const key of ['x','y']){near(s.pos[key],e.pos[key],'pos');near(s.rally[key],e.rally[key],'rally');near(s.center[key],e.center[key],'center')}}
}
let frames=0
for(const row of read('analysis/reinforcement-attack-oracle.json')){const attack=new SpecialReinforcementAttack(row.start),hits=[]
 for(const [index,e]of row.frames.entries()){const time=row.start+index*(1/30),hit=attack.advance(time,index>=12?{[{'stunned':'stunned','dead':'dead','rally':'rally'}[row.scenario]]:true}:{});if(hit)hits.push(time);assert.equal(attack.name,e.name);near(attack.at,e.ts,'animation ts');near(attack.attackTs,e.attackTs,'attack ts');assert.equal(attack.done,e.done);if(attack.done)assert.equal(attack.result,e.result);frames++}
 const expected=row.events.filter(e=>e.kind==='damage');assert.equal(hits.length,expected.length);for(const [index,time]of hits.entries())near(time,expected[index].at,'hit frame')
}
function unit(id,pos,name='soldier_reinforcement_base'){const template=structuredClone(templates[name]);return{id,name,template,hp:template.health.hp_max,pos:{...pos}}}
for(const row of read('analysis/reinforcement-aura-oracle.json')){const aura=new ReinforcementAura(),source=unit(1,{x:500,y:350},'soldier_reinforcement_special'),soldiers=[source,...[[500,350],[570,350],[570.01,350],[500,399],[500,399.01]].map(([x,y],i)=>unit(i+11,{x,y}))],events=[]
 aura.onQueue=(target,at)=>{for(const name of ['mod_reinforcement_special_damage','mod_reinforcement_special_armor'])events.push({at,name,target:target.id===1?0:target.id-10})};aura.start(source,0,row.duration)
 let removedAt
 for(let frame=0;frame<=180;frame++){const time=frame*(1/30);if(frame===3){if(row.scenario==='move')source.pos.x=600;if(row.scenario==='dead')source.hp=0;if(row.scenario==='removed')soldiers.splice(0,1)}aura.advance(time,soldiers);if(!aura.auras.length){removedAt=time;break}}
 near(removedAt,row.removedAt,'aura removal');assert.equal(events.length,row.events.length);for(const [index,event]of events.entries()){const e=row.events[index];assert.equal(event.name,e.name);assert.equal(event.target,e.target);near(event.at,e.at,'aura cycle')}
}
// Modifier inserts occur on the following tick, persist after the aura, refresh without stacking and expire.
const aura=new ReinforcementAura(),source=unit(1,{x:500,y:350},'soldier_reinforcement_special'),target=unit(2,{x:500,y:350}),soldiers=[source,target];aura.start(source,0)
aura.advance(0,soldiers);assert.equal(target.reinforcementDamageFactor,undefined);aura.advance(1/30,soldiers);assert.equal(target.reinforcementDamageFactor,1.1);near(soldierHealth(target).armor,.15,'buff armor')
for(let frame=2;frame<=10;frame++)aura.advance(frame*(1/30),soldiers);assert.equal(aura.auras.length,0);assert.equal(target.reinforcementDamageFactor,1.1);near(soldierHealth(target).armor,.15,'refresh does not stack')
for(let frame=11;frame<=405;frame++)aura.advance(frame*(1/30),soldiers);assert.equal(target.reinforcementDamageFactor,1);assert.equal(soldierHealth(target).armor,0);assert.equal(aura.buffs.size,0)
// Actual controller integration: special entrance locks actions, then the three-part attack damages once.
const b=new BarracksCombat(powerUpgradeTemplates(templates,{reinforcements:['l2a','l3','l4a','l5a','l6']}),()=>.5,()=>{});b.reinforce({x:500,y:350},0)
const special=b.soldiers[0],foe={id:777,hp:5000,template:structuredClone(templates.enemy_bandit),path:{position:{x:special.pos.x-40,y:special.pos.y},direction:{x:1,y:0},finished:false,remainingNodes:1}}
assert.equal(special.visualOverride.name,'in');assert.equal(special.healthBarHidden,true)
for(let frame=0;frame<=19;frame++)b.advance(frame*(1/30),1/30,[],[])
assert.equal(special.reinforcementInAt,undefined);assert.equal(special.healthBarHidden,false);assert.equal(special.reinforcementDamageFactor,1.1)
special.target=foe;b.soldierAttack(special,foe,1);const names=new Set()
for(let frame=0;frame<=36;frame++){if(!special.specialAttack)break;b.advanceSpecialAttack(special,1+frame*(1/30));if(special.visualOverride)names.add(special.visualOverride.name)}
assert.deepEqual([...names],['attack_in','attack_loop','attack_out']);assert.equal(foe.hp,4970,'ceil(12×2.25×1.1) reaches actual damage');assert.equal(special.specialAttack,undefined)
const {HeroSystem}=await import('../src/game/HeroSystem.ts'),{PathFollower}=await import('../src/game/PathFollower.ts')
const heroBarracks=new BarracksCombat(templates,()=>.5,()=>{}),heroes=new HeroSystem(templates,heroBarracks,()=>.5),gerald=heroes.insertGerald({x:500,y:350},0),zefira=heroes.insert('hero_zefira',{x:500,y:350},0),heroAura=new ReinforcementAura()
const heroSource=unit(1001,{x:500,y:350},'soldier_reinforcement_special');heroAura.start(heroSource,0);heroAura.advance(0,[heroSource,gerald,zefira]);heroAura.advance(1/30,[heroSource,gerald,zefira]);assert.equal(gerald.reinforcementDamageFactor,1.1);assert.equal(zefira.reinforcementDamageFactor,1.1)
const ultimateFoe={id:801,hp:1000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:530,y:350},{x:900,y:350}])};gerald.target=ultimateFoe;heroes.geraldUltimate.configure(['ulti'])
for(let frame=0;frame<=100;frame++)heroes.geraldUltimate.advance(frame*(1/30),gerald,[ultimateFoe]);assert.equal(ultimateFoe.hp,779,'native ceil(200×1.1) includes floating-point rounding')
const rangedFoe={id:802,hp:1000,frozen:true,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:620,y:350},{x:900,y:350}])};zefira.readyAt=-9;zefira.rangedCriticalChance=0
for(let frame=0;frame<=30&&!heroes.ranged.projectiles.length;frame++)heroes.ranged.advance(frame*(1/30),1/30,[zefira],[rangedFoe]);const projectile=heroes.ranged.projectiles[0];assert(projectile);near(projectile.damageFactor,templates[projectile.name].bullet.damage_factor*1.1,'hero ranged captures aura factor')
console.log(`${squads.length} native reinforcement squads, ${frames} loop-attack frames and 8 native aura traces match; queued armor/damage buffs refresh without stacking, outlive aura and expire`)
