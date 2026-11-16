import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.1;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_gerald:40000},heroUpgrades:{hero_gerald:['skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e','skill_c','talent_1']}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(resource),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(this.dodgeFixture===undefined&&this.heroes.gerald&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    this.dodgeFixture=this.time;this.dodgePhase=1;this.spawn({enemy:'enemy_bandit',pi:3,spi:1},this.time);const e=this.pendingEnemies.at(-1).enemy;e.path.ni=100;Object.assign(e.path.position,this.levelData.paths.paths[2][0][99])
    const h=this.heroes.gerald;h.pos={x:e.path.position.x-35,y:e.path.position.y-15};h.rally={...h.pos};h.center={...h.pos};h.deploying=false;h.moving=false;h.target=e;h.attack=undefined
    this.dodgeHp=h.hp
    this.dodgeMisses=0;this.dodgeBlood=0;const miss=this.enemyRanged.onMiss,effect=this.enemyRanged.onEffect
    this.enemyRanged.onMiss=(...args)=>{this.dodgeMisses++;miss(...args)};this.enemyRanged.onEffect=(name,...args)=>{if(name==='fx_blood_splat')this.dodgeBlood++;effect(name,...args)}
   }
   if(this.dodgeFixture!==undefined){const h=this.heroes.gerald,pops=this.barracks.dodges.pops;window.dodgeSession=this;window.dodgeObservation={phase:this.dodgePhase,hp:h.hp,initial:this.dodgeHp,chance:h.dodge?.chance,pops:pops.filter(p=>this.time>p.at).map(p=>({id:p.id,at:p.at,rotation:p.rotation,pos:p.pos})),misses:this.dodgeMisses,blood:this.dodgeBlood}
    if(this.dodgePhase===1&&pops.some(p=>this.time>p.at)&&!this.dodgeMeleeCaptured){this.dodgeMeleeCaptured=true;this.paused=true}
    if(this.dodgePhase===2&&this.dodgeMisses>0&&pops.some(p=>this.time>p.at)&&!this.dodgeRangeCaptured){this.dodgeRangeCaptured=true;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.dodgeObservation?.pops.length>0)
 const melee=await page.evaluate(()=>window.dodgeObservation);assert.equal(melee.chance,.35);assert.equal(melee.hp,melee.initial);await page.screenshot({path:'analysis/web-gerald-dodge-melee.png'})
 await page.evaluate(()=>{
  const g=window.dodgeSession,h=g.heroes.gerald;g.enemies.length=0;h.target=undefined;h.attack=undefined;h.scriptLocked=false;h.visualOverride=undefined
  g.spawn({enemy:'enemy_shadow_archer',pi:3,spi:1},g.time);const e=g.pendingEnemies.at(-1).enemy;e.path.ni=100;Object.assign(e.path.position,g.levelData.paths.paths[2][0][99])
  h.pos={x:e.path.position.x-110,y:e.path.position.y};h.rally={...h.pos};h.center={...h.pos};h.deploying=false;h.moving=false
  g.dodgePhase=2;g.dodgeHp=h.hp;g.paused=false
 })
 await page.waitForFunction(()=>window.dodgeObservation?.phase===2&&window.dodgeObservation.misses>0&&window.dodgeObservation.pops.length>0)
 const ranged=await page.evaluate(()=>window.dodgeObservation);assert.equal(ranged.hp,ranged.initial);assert.equal(ranged.blood,0);assert(ranged.pops.length>0);await page.screenshot({path:'analysis/web-gerald-dodge-arrow.png'})
 await page.evaluate(()=>{const g=window.dodgeSession;g.enemies.length=0;g.heroes.gerald.target=undefined;g.paused=false})
 await page.waitForFunction(()=>window.dodgeObservation.pops.length===0)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Gerald block: legal talent1 with native 35% chance, controlled RNG only, original melee and arrow damage blocked, native rotated pop tween and cleanup, arrow miss without blood; no JS/asset errors')
}finally{await browser.close()}
