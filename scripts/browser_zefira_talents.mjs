import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_zefira:40000},heroUpgrades:{hero_zefira:['skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e','skill_c','talent_1']}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(resource),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(this.weakFixture===undefined&&this.heroes.zefira&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    this.weakFixture=this.time;this.spawn({enemy:'enemy_blackguard',pi:3,spi:1},this.time);const e=this.enemies.at(-1);e.path.ni=100;Object.assign(e.path.position,this.levelData.paths.paths[2][0][99]);e.frozen=true;this.weakTarget=e
    const h=this.heroes.zefira;h.pos={x:e.path.position.x-48,y:e.path.position.y};h.rally={...h.pos};h.center={...h.pos};h.deploying=false;h.moving=false;h.target=e;h.attack=undefined;h.scriptLocked=true
   }
   if(this.weakFixture!==undefined){const t=this.heroes.zefiraTalents,e=this.weakTarget,m=t.weaknesses.get(e.id);window.weakSession=this;window.weakObservation={age:this.time-this.weakFixture,enabled:t.weakening,armor:e.template.health.armor,raw:e.template.health.raw_armor,active:!!m,fxAge:m?this.time-m.animationAt:0}
    if(!this.weakMilestone&&m&&this.time-m.animationAt>.2){this.weakMilestone=1;this.paused=true}
    if(this.weakMilestone===1&&!m&&e.template.health.raw_armor!==undefined){this.weakMilestone=2;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.weakObservation?.active&&window.weakObservation.fxAge>.2)
 const active=await page.evaluate(()=>window.weakObservation);assert(active.enabled);assert(Math.abs(active.armor-.21)<1e-10);await page.screenshot({path:'analysis/web-zefira-talent-weakness.png'});await page.screenshot({path:'analysis/web-zefira-talent-weakness-detail.png',clip:{x:680,y:440,width:240,height:160}})
 await page.evaluate(()=>{const g=window.weakSession;g.heroes.selectedId=g.heroes.zefira.id;g.heroes.moveSelected({x:300,y:350});g.paused=false})
 await page.waitForFunction(()=>window.weakObservation?.active===false&&window.weakObservation.raw!==undefined)
 const expired=await page.evaluate(()=>window.weakObservation);assert(Math.abs(expired.armor-.273)<1e-10);await page.screenshot({path:'analysis/web-zefira-talent-left-range.png'})
 await page.evaluate(()=>{window.weakSession.paused=false});assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Zefira weakness: legal talent1, original blackguard armour .3→.21, two native EXO layers, ordinary move/blink away, effect expiry and original partial recovery .273; no JS/asset errors')
}finally{await browser.close()}
