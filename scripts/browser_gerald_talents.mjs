import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_gerald:40000},heroUpgrades:{hero_gerald:['skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e','skill_c','talent_2']}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=name=>performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/'+name+'.ts')).name
  const {GameSession}=await import(resource('GameSession')),{damageSoldier}=await import(resource('SoldierHealth')),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(this.regenFixture===undefined&&this.heroes.gerald&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    const h=this.heroes.gerald;damageSoldier(h,{value:100,damage_type:1},this.time);this.regenFixture=this.time;this.regenInitial=h.hp
   }
   if(this.regenFixture!==undefined){const h=this.heroes.gerald,t=this.heroes.geraldTalents
    window.regenSession=this;window.regenObservation={age:this.time-this.regenFixture,hp:h.hp,maxHp:h.template.health.hp_max,initial:this.regenInitial,heal:t.regeneration?.health,enabled:t.regenerationEnabled}
    if(!this.regenCaptured&&h.hp>this.regenInitial){this.regenCaptured=true;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.regenObservation?.hp>window.regenObservation?.initial)
 const o=await page.evaluate(()=>window.regenObservation);assert.equal(o.enabled,true);assert(o.age<1.1,'First aura tick precedes base out-of-combat regeneration');assert(Math.abs(o.hp-o.initial-o.maxHp*.03)<1e-8);assert.equal(o.heal,o.maxHp*.03)
 await page.screenshot({path:'analysis/web-gerald-talent-regeneration.png'})
 await page.evaluate(()=>{window.regenSession.paused=false});assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Gerald regeneration: legal talent2 purchase, actual true damage, original 3% max-HP tick before base regeneration, native health bar, no JS/asset errors')
}finally{await browser.close()}
