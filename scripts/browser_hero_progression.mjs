import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_gerald:995,hero_zefira:4000}})))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 assert.equal(await page.locator('[data-hero="杰拉尔德"] .hero-level').textContent(),'1')
 assert.equal(await page.locator('[data-hero="泽菲菈"] .hero-level').textContent(),'3')
 await page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),original=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   if(!this.xpFixture && this.heroes.gerald?.level===1){this.xpFixture=true;this.heroes.gerald.hp=1;this.heroes.gerald.xpQueued=10}
   original.call(this,dt)
   const h=this.heroes.gerald;if(h)window.heroXpObservation={xp:h.xp,level:h.level,hp:h.hp,animation:h.visualOverride?.name,locked:h.scriptLocked}
  }
 })
 await page.waitForFunction(()=>window.heroXpObservation?.animation==='level_up')
 await page.screenshot({path:'analysis/web-hero-level-up.png'})
 assert.equal(await page.locator('[data-hero="杰拉尔德"] .hero-level').textContent(),'2')
 await page.waitForFunction(()=>window.heroXpObservation?.level===2&&!window.heroXpObservation.locked)
 assert.deepEqual(await page.evaluate(()=>window.heroXpObservation),{xp:1005,level:2,hp:240,animation:undefined,locked:false})
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 assert.equal(await page.locator('[data-hero="杰拉尔德"] .hero-level').textContent(),'2')
 assert.equal(await page.locator('[data-hero="泽菲菈"] .hero-level').textContent(),'3')
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.progress.v1')))
 assert.equal(saved.heroes.hero_gerald,1005);assert.equal(saved.heroes.hero_zefira,4000)
 await page.screenshot({path:'analysis/web-hero-xp-next-stage.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser controlled XP fixture: saved hero levels restore, queued XP triggers original level-up animation/full heal/native portrait XP bar, both hero levels persist into next stage; no page or asset errors. Natural six-stage playthrough still pending.')
}finally{await browser.close()}
