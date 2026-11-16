import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.1;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_zefira:40000},heroUpgrades:{hero_zefira:['skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e','skill_c','talent_2']}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(resource),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(!this.critFixture&&this.heroes.zefira&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    this.critFixture=true;this.critPhase='melee';this.spawn({enemy:'enemy_blackguard',pi:3,spi:1},this.time);const e=this.pendingEnemies.at(-1).enemy;e.path.ni=100;Object.assign(e.path.position,this.levelData.paths.paths[2][0][99]);e.frozen=true;this.critTarget=e;this.critInitial=e.hp
    const h=this.heroes.zefira;h.pos={x:e.path.position.x-35,y:e.path.position.y-15};h.rally={...h.pos};h.center={...h.pos};h.deploying=false;h.moving=false;h.target=e;h.attack=undefined;h.scriptLocked=true;this.critAwaitInsert=true
    // Isolate basic attacks; keep the legally purchased passive and its real stat patches.
    this.heroes.zefiraSkills.lastA=Infinity;this.heroes.zefiraSkills.lastB=Infinity;this.heroes.gerald.scriptLocked=true
   }
   if(this.critAwaitInsert&&this.enemies.includes(this.critTarget)){this.critAwaitInsert=false;this.heroes.zefira.scriptLocked=false}
   if(this.critFixture){const h=this.heroes.zefira,e=this.critTarget,pops=this.barracks.dodges.pops.filter(p=>p.frame==='pop_0021'&&this.time>p.at)
    window.critSession=this;window.critObservation={phase:this.critPhase,chance:h.template.melee.attacks[0].critical_chance,rangedChance:h.rangedCriticalChance,hp:e.hp,initial:this.critInitial,pops:pops.map(p=>({frame:p.frame,pos:p.pos})),factor:h.template.unit.damage_factor}
    if(pops.length&&!this.critCaptured){this.critCaptured=true;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.critObservation?.pops.length>0)
 const melee=await page.evaluate(()=>window.critObservation);assert.equal(melee.chance,.2);assert.equal(melee.rangedChance,.2);assert(melee.hp<melee.initial);await page.screenshot({path:'analysis/web-zefira-critical-melee.png'})
 await page.evaluate(()=>{const g=window.critSession,h=g.heroes.zefira,e=g.critTarget;h.attack=undefined;g.barracks.advanceCriticals(g.time);h.target=undefined;h.pos={x:e.path.position.x-120,y:e.path.position.y};h.rally={...h.pos};h.center={...h.pos};h.readyAt=g.time;g.barracks.dodges.pops.length=0;g.critPhase='ranged';g.critInitial=e.hp;g.critCaptured=false;g.paused=false})
 await page.waitForFunction(()=>window.critObservation?.phase==='ranged'&&window.critObservation.pops.length>0)
 const ranged=await page.evaluate(()=>window.critObservation);assert(ranged.hp<ranged.initial);await page.screenshot({path:'analysis/web-zefira-critical-ranged.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Zefira critical: legal talent2, original melee/ranged 20% configuration, actual damage and native crit sprites after queued insertion; no JS/asset errors')
}finally{await browser.close()}
