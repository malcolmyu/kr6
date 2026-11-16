import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(resource),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(!this.culvFixture&&this.heroes.zefira&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    this.culvFixture=true;this.culvEffects=[];const effect=this.combat.onEffect;this.combat.onEffect=(name,...args)=>{this.culvEffects.push(name);effect(name,...args)}
    const point=this.levelData.paths.paths[2][0][99];this.culvSite=this.towers.sites.filter(s=>!s.tower&&!s.building).sort((a,b)=>Math.hypot(a.pos.x-point.x,a.pos.y-point.y)-Math.hypot(b.pos.x-point.x,b.pos.y-point.y))[0];this.build(this.culvSite.id,'archers');this.culvSite.attackDisabled=true
    for(const h of this.heroes.team)h.scriptLocked=true
   }
   if(this.culvFixture&&this.culvSite.tower&&!this.culvRay){
    this.spawn({enemy:'enemy_bandit',pi:3,spi:1},this.time);const e=this.enemies.at(-1);e.path.ni=100;Object.assign(e.path.position,this.levelData.paths.paths[2][0][99]);e.frozen=true;this.culvEnemy=e;this.culvBefore=e.hp
    const s=this.culvSite;this.culvRay=this.combat.culverineRays.launch('bullet_culverine_lvl1',{x:s.pos.x+16,y:s.pos.y+65},e.path.position,e,undefined,1,this.time)
   }
   if(this.culvRay){const r=this.culvRay;window.culvSession=this;window.culvObservation={visible:r.born!==undefined&&!r.hidden&&!r.removed,damage:this.culvBefore-this.culvEnemy.hp,removed:r.removed,effects:this.culvEffects}
    if(this.culvSoldAt!==undefined&&!this.culvSoldCaptured&&this.time>this.culvSoldAt){this.culvSoldCaptured=true;this.paused=true;window.culvObservation.soldCaptured=true}
    if(!this.culvCaptured&&window.culvObservation.visible){this.culvCaptured=true;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.culvObservation?.visible)
 const o=await page.evaluate(()=>window.culvObservation);assert.equal(o.damage,14);assert(o.effects.includes('fx_bullet_culverine_hit'));await page.screenshot({path:'analysis/web-culverine-ray.png'});await page.screenshot({path:'analysis/web-culverine-ray-detail.png',clip:{x:650,y:350,width:220,height:240}})
 await page.evaluate(()=>{const g=window.culvSession;g.paused=false;g.sellTower(g.culvSite.id);g.culvSoldAt=g.time})
 await page.waitForFunction(()=>window.culvObservation.soldCaptured);assert.equal(await page.evaluate(()=>window.culvObservation.removed),false);await page.evaluate(()=>{window.culvSession.paused=false})
 await page.waitForFunction(()=>window.culvObservation.removed)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser isolated Culverine ray: native beam sprite/scale/rotation, queued original14 explosion damage and hit FX, unbound source sale preserves the native ray lifetime; no JS/asset errors. Tower targeting/animation/loadout integration is not covered by this fixture.')
}finally{await browser.close()}
