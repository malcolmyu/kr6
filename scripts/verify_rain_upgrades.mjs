import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {RainControl} from '../src/game/RainControl.ts'
import {RainAreas,rainImpactEntities} from '../src/game/RainAreas.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/rain-of-fire.json')
const near=(a,b,label)=>assert(Math.abs(a-b)<1e-8,`${label}: ${a} != ${b}`)
const controls=read('analysis/rain-control-oracle.json')
for(const row of controls){const level=read(`public/data/level0${row.stage}.json`),config={...data.templates.power_rain_of_fire_control,meteor_count:row.upgraded?5:3,upgrade_cataclysm:row.upgraded},control=new RainControl(level,config,()=>row.roll),events=[];control.onMeteor=(to,at,cataclysm)=>events.push({at,to,cataclysm});control.cast({x:550,y:315});let removedAt
 for(let frame=0;frame<=90;frame++){const time=row.birth+frame*(1/30);control.advance(time);if(!control.casts.length){removedAt=time;break}}
 near(removedAt,row.removedAt,'controller removal');assert.equal(events.length,row.events.length,`${row.stage}/${row.roll}/${row.upgraded}`);for(const [index,event]of events.entries()){const expected=row.events[index];near(event.at,expected.at,'burst time');near(event.to.x,expected.to.x,'meteor x');near(event.to.y,expected.to.y,'meteor y')}
}
console.log(`${controls.length} native rain controllers match all first-three-stage random road destinations, lane clamping, burst timing and cataclysm attempts`)
for(const row of read('analysis/rain-impact-oracle.json')){const patch=read('analysis/power-upgrade-patch-oracle.json').find(p=>p.kind==='rain_of_fire'&&p.selected.join(',')===row.selected.join(','));assert.deepEqual(rainImpactEntities(patch.templates.bullet_power_rain_of_fire,row.water),row.events.slice(2))}
const entities=read('public/data/entities.json')
const enemy=(id,x=500,y=350)=>({id,name:'enemy_bandit',hp:5000,template:{...structuredClone(entities.enemy_bandit),motion:{max_speed:60}},path:{position:{x,y}}})
for(const row of read('analysis/rain-extra-oracle.json')){
 const areas=new RainAreas(data.templates,()=>.5,()=>{}),enemies=[[0,0],[30,0],[60,0],[60.01,0],[0,42],[0,41.99],[20,0],[20,0],[20,0]].map(([x,y],i)=>enemy(i+1,500+x,350+y)),events=[];enemies[6].template.vis.flags|=128;enemies[7].template.vis.flags|=32;enemies[8].template.vis.bans=8
 areas.startExtra({x:500,y:350},row.birth);let removedAt
 for(let frame=0;frame<=90;frame++){const time=row.birth+frame*(1/30),hp=enemies.map(e=>e.hp);areas.advance(time,enemies);for(const [i,e]of enemies.entries())if(e.hp!==hp[i])events.push({at:time,target:e.id,value:hp[i]-e.hp});if(!areas.explosions.length){removedAt=time;break}}
 near(removedAt,row.removedAt,'extra animation end');assert.equal(events.length,row.events.length);for(const [index,event]of events.entries()){const e=row.events[index];near(event.at,e.at,'explosion delay');assert.equal(event.target,e.target);assert.equal(event.value,e.value)}
}
let areaFrames=0
for(const row of read('analysis/rain-area-oracle.json')){
 const templates=structuredClone(data.templates);if(row.upgraded){for(const name of ['aura_bullet_power_rain_of_fire_dmg','aura_bullet_power_rain_of_fire_slow'])templates[name].aura.duration+=4;templates.mod_bullet_power_rain_of_fire_burn.dps.damage_inc=1.5}
 const areas=new RainAreas(templates,()=>.5,()=>{}),e=enemy(1),events=[];areas.onQueue=(name,enemy,at)=>events.push({name,at});areas.queue('aura_bullet_power_rain_of_fire_dmg',{x:500,y:350});areas.queue('aura_bullet_power_rain_of_fire_slow',{x:500,y:350});if(row.upgraded)templates.decal_power_rain_of_fire_scorch.duration+=4;areas.queue('decal_power_rain_of_fire_scorch',{x:500,y:350},row.birth*(1/30))
 for(const [index,expected]of row.frames.entries()){const frame=index+1,time=(row.birth+frame)*(1/30),label=`${row.birth}/${row.upgraded}/${row.mode}/${frame}`
  if(row.mode==='move')e.path.position.x=frame>=31?900:500
  if(row.mode==='return')e.path.position.x=frame>=31&&frame<61?900:500
  if(row.mode==='immune')e.template.vis.bans=frame<31?16388:0
  if(row.mode==='death'&&frame===31)e.hp=0
  if(row.mode==='overlap'&&frame===16){areas.queue('aura_bullet_power_rain_of_fire_dmg',{x:500,y:350});areas.queue('aura_bullet_power_rain_of_fire_slow',{x:500,y:350})}
  areas.advance(time,[e]);assert.equal(e.hp,expected.hp,label+' hp');near(e.template.motion.max_speed,expected.speed,label+' speed')
  const scorch=areas.scorches[0];assert.equal(!!scorch,expected.scorch.visible,label+' scorch visible');if(scorch){near(scorch.spriteAt,expected.scorch.spriteAt,label+' scorch sprite clock');if(scorch.fadeAt!==undefined)near(scorch.fadeAt,expected.scorch.fadeAt,label+' scorch fade clock');near(areas.scorchAlpha(scorch,time)*255,expected.scorch.alpha,label+' scorch alpha')}
  const b=areas.burns.get(e.id),s=areas.slows.get(e.id),active=[];if(b)active.push({name:'mod_bullet_power_rain_of_fire_burn',at:b.at,dpsTs:b.dpsTs,pending:b.pending||!!b.removeNext,reverse:b.fadeAt!==undefined,alpha:255*areas.alpha(b,time)});if(s)active.push({name:'mod_bullet_power_rain_of_fire_slow',at:s.at,pending:s.pending})
  assert.equal(active.length,expected.active.length,label+' active');for(const mod of active){const native=expected.active.find(m=>m.name===mod.name);assert(native,label);assert.equal(mod.pending,native.pending,label+' pending');near(mod.at,native.at,label+' mod ts');if(mod.dpsTs!==undefined){near(mod.dpsTs,native.dpsTs,label+' dps ts');assert.equal(mod.reverse,native.reverse,label+' reverse');near(mod.alpha,native.alpha,label+' alpha')}}areaFrames++
 }
 const sort=events=>events.toSorted((a,b)=>a.at-b.at||a.name.localeCompare(b.name));const a=sort(events),b=sort(row.events);assert.equal(a.length,b.length);for(const [i,event]of a.entries()){assert.equal(event.name,b[i].name);near(event.at,b[i].at,'aura application')}
}
console.log(`34 native upgrade impact branches, 2 explosion falloff/timing cases and ${areaFrames} original burn/slow simulation frames match damage, refresh, overlap, immunity, movement/return, death and visual fade`)
const {GameSession}=await import('../src/game/GameSession.ts'),level=read('public/data/level02.json'),program=read('public/data/level02-campaign.json')
for(const branch of ['slow','extra']){
 const nodes=['l2a','l3',branch==='slow'?'l4a':'l4b',branch==='slow'?'l5a':'l5b','l6'],game=new GameSession(level,program,entities,()=>.5,'campaign',undefined,{rain_of_fire:nodes}),p=game.powers,e=enemy(501,550,315);p.canUse=()=>true
 const sounds=[],queued=[];p.onSound=name=>sounds.push(name);p.rainAreas.onQueue=(name,e,time)=>queued.push(name);p.selected='rain_of_fire';assert(p.cast({x:550,y:315},0));assert.equal(p.cooldowns.rain_of_fire,45)
 p.advance(0,1/30,[e]);assert.equal(p.meteors.length,0,'controller queues bullets for next tick');p.advance(1/30,1/30,[e]);assert.equal(p.meteors.length,2)
 let sawExplosion=false,sawSlow=false,sawBurn=false,sawScorch=false
 for(let frame=2;frame<=600;frame++){p.advance(frame*(1/30),1/30,[e]);sawExplosion||=p.rainAreas.explosions.some(x=>x.hit);sawSlow||=e.template.motion.max_speed===24;sawBurn||=p.rainAreas.burns.size>0;sawScorch||=p.rainAreas.scorches.length>0}
 assert(sawBurn&&sawScorch);assert.equal(sawExplosion,branch==='extra');assert.equal(sawSlow,branch==='slow');assert(e.hp<4900);assert.equal(sounds.filter(n=>n==='PowersRainOfFireCast').length,branch==='extra'?10:8);assert.equal(sounds.filter(n=>n==='PowersRainOfFireImpact').length,branch==='extra'?10:8);assert.equal(e.template.motion.max_speed,60)
 assert.equal(p.rainAreas.burns.size+p.rainAreas.slows.size+p.rainAreas.areas.length+p.rainAreas.scorches.length+p.rainAreas.explosions.length,0)
}
console.log('Actual upgraded PowerSystem casts restore both rank6 branches: queued8/10 meteors,45s cooldown, burn/scorch, slow or delayed explosion, real damage and complete expiry cleanup')
