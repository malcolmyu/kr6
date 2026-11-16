import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_gerald:52000},heroUpgrades:{hero_gerald:['skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e','skill_c','talent_2','ulti']}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(resource),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(this.ultimateFixture===undefined&&this.heroes.gerald&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    this.ultimateFixture=this.time;this.ultimateSounds=[];const sound=this.onSound;this.onSound=name=>{this.ultimateSounds.push(name);sound(name)}
    this.ultimateTargets=[];for(let i=0;i<2;i++){this.spawn({enemy:'enemy_shadow_archer',pi:3,spi:1},this.time);const e=this.enemies.at(-1);e.path.ni=100;Object.assign(e.path.position,this.levelData.paths.paths[2][0][99]);e.frozen=true;this.ultimateTargets.push({enemy:e,before:e.hp})}
    const e=this.ultimateTargets[0].enemy,h=this.heroes.gerald;h.pos={x:e.path.position.x-30,y:e.path.position.y};h.rally={...h.pos};h.center={...h.pos};h.facingLeft=false;h.deploying=false;h.moving=false;h.target=e;h.attack=undefined;h.scriptLocked=false
   }
   if(this.ultimateFixture!==undefined){const h=this.heroes.gerald,u=this.heroes.geraldUltimate;window.ultimateSession=this;window.ultimateObservation={age:this.time-this.ultimateFixture,enabled:u.enabled,casting:!!u.cast,initial:u.cast?.initialAt!==undefined,hit:u.cast?.hit??false,stuns:this.heroes.zefiraSkills.modifiers.stuns.size,xp:h.xpQueued,damage:this.ultimateTargets.map(t=>t.before-t.enemy.hp),dead:this.ultimateTargets.map(t=>t.enemy.hp<=0),sounds:this.ultimateSounds}
    const o=window.ultimateObservation
    if(!this.ultimateMilestone&&o.casting||this.ultimateMilestone===1&&o.initial||this.ultimateMilestone===2&&o.damage[1]>0){this.ultimateMilestone=(this.ultimateMilestone??0)+1;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 const shot=async(name,condition)=>{await page.waitForFunction(condition);await page.screenshot({path:`analysis/web-gerald-ultimate-${name}.png`});await page.evaluate(()=>{window.ultimateSession.paused=false})}
 await shot('cast',()=>window.ultimateObservation?.casting)
 await shot('stun',()=>window.ultimateObservation?.initial)
 await shot('impact',()=>window.ultimateObservation?.damage[1]>0)
 const hit=await page.evaluate(()=>window.ultimateObservation);assert.equal(hit.enabled,true);assert.deepEqual(hit.damage,[200,150]);assert.deepEqual(hit.dead,[true,true]);assert.equal(hit.xp,25)
 await page.waitForFunction(()=>window.ultimateObservation.age>3.3);assert.equal(await page.evaluate(()=>window.ultimateObservation.casting),false)
 const sounds=await page.evaluate(()=>window.ultimateObservation.sounds);for(const s of ['HeroGeraldDivineBladeCast','HeroGeraldTauntUltimate','HeroDivineBladeImpact'])assert(sounds.includes(s))
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Gerald ultimate: legal ulti purchase, automatic melee trigger, native opening/initial stun/decal, exact primary200 and excluded-primary area150, skillXP25 and sound dispatch, recovery; no JS/asset errors')
}finally{await browser.close()}
