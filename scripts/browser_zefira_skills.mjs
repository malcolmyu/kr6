import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_zefira:1000},heroUpgrades:{hero_zefira:['skill_a','skill_b']}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(resource),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(this.zefiraFixture===undefined&&this.time>19&&this.heroes.zefira&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    this.zefiraSounds=[];const sound=this.onSound;this.onSound=name=>{this.zefiraSounds.push(name);sound(name)}
    this.spawnCinematicEnemy('enemy_shadow_archer',3,this.levelData.paths.paths[2][0][99]);const e=this.enemies.at(-1);e.hp=e.template.health.hp_max=5000;e.frozen=true
    const h=this.heroes.zefira;Object.assign(h.pos,{x:e.path.position.x-35,y:e.path.position.y-15});h.rally={...h.pos};h.center={...h.pos};h.deploying=false;h.moving=false;h.scriptLocked=false;h.target=e;h.attack=undefined
    this.zefiraFixture=this.time;this.zefiraTarget=e
   }
   if(this.zefiraFixture!==undefined){const s=this.heroes.zefiraSkills;window.zefiraSession=this;window.zefiraObservation={age:this.time-this.zefiraFixture,levelA:s.levelA,levelB:s.levelB,casting:!!s.cast,shield:!!s.shield||s.nativeShield.shields.length>0,ending:s.shield?.endingAt!==undefined||s.nativeShield.shields.some(a=>a.phase==='end'),decals:s.decals.length+s.nativeHammer.decals.length,stuns:s.modifiers.stuns.size+s.nativeHammer.stuns.size,sounds:this.zefiraSounds};
    const o=window.zefiraObservation
    if(!this.zefiraMilestone&&o.shield&&o.casting||this.zefiraMilestone===1&&o.decals>0&&o.stuns>0||this.zefiraMilestone===2&&o.ending){this.zefiraMilestone=(this.zefiraMilestone??0)+1;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.zefiraObservation?.shield&&window.zefiraObservation?.casting);console.log('Both skills cast')
 assert.deepEqual(await page.evaluate(()=>[window.zefiraObservation.levelA,window.zefiraObservation.levelB]),[1,1])
 await page.screenshot({path:'analysis/web-zefira-skills-cast.png'});await page.evaluate(()=>{window.zefiraSession.paused=false})
 await page.waitForFunction(()=>window.zefiraObservation.decals>0&&window.zefiraObservation.stuns>0).catch(async e=>{console.log(await page.evaluate(()=>({observation:window.zefiraObservation,milestone:window.zefiraSession?.zefiraMilestone,paused:window.zefiraSession?.paused,hero:window.zefiraSession?.heroes.zefira&&{pos:window.zefiraSession.heroes.zefira.pos,hp:window.zefiraSession.heroes.zefira.hp,visual:window.zefiraSession.heroes.zefira.visualOverride},target:window.zefiraSession?.zefiraTarget&&{pos:window.zefiraSession.zefiraTarget.path.position,hp:window.zefiraSession.zefiraTarget.hp},cast:window.zefiraSession?.heroes.zefiraSkills.cast&&{at:window.zefiraSession.heroes.zefiraSkills.cast.at,flip:window.zefiraSession.heroes.zefiraSkills.cast.flip,hit:window.zefiraSession.heroes.zefiraSkills.cast.hit}})));throw e});console.log('Hammer hit')
 await page.screenshot({path:'analysis/web-zefira-skills-hit.png'});await page.evaluate(()=>{window.zefiraSession.paused=false})
 await page.waitForFunction(()=>window.zefiraObservation.ending)
 await page.screenshot({path:'analysis/web-zefira-skills-end.png'});await page.evaluate(()=>{window.zefiraSession.paused=false})
 await page.waitForFunction(()=>window.zefiraObservation.age>5)
 const o=await page.evaluate(()=>window.zefiraObservation);assert(!o.shield);assert(o.sounds.includes('HeroZefiraDazzlingHammerCast'));assert(o.sounds.includes('HeroZefiraShieldingBladesCast'))
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Zefira: legal saved purchases, real melee skill selection, original hammer/shield/decal/stun art and sound events, native ending and cleanup; no JS/asset errors')
}finally{await browser.close()}
