import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},powers:['reinforcements','rain_of_fire','royal_edict']})))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   if(!this.royalFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){this.royalFixture=true;this.build('4','archers');this.build('6','catapult')}
   advance.call(this,dt)
   if(this.royalFixture)window.royalObservation={time:this.time,ready:this.towers.sites.filter(s=>['4','6'].includes(s.id)).every(s=>s.tower&&!s.building),cooldown:this.powers.cooldowns.royal_edict,remaining:this.powers.remaining('royal_edict',this.time),buffs:[...this.powers.royal.buffs].map(([id,b])=>({id,factor:b.site.damageFactor,age:this.time-b.born,remaining:b.expiresAt-this.time})),factors:this.towers.sites.filter(s=>['4','6'].includes(s.id)).map(s=>s.damageFactor),casts:this.powers.royal.casts.length}
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 assert.equal(await page.locator('[data-power]').count(),3)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click();const confirm=page.getByRole('button',{name:'确认出击',exact:true});if(await confirm.count())await confirm.click()
 await page.waitForFunction(()=>window.royalObservation?.ready)
 await page.waitForFunction(()=>!document.querySelector('[data-power=royal_edict]').disabled)
 await page.keyboard.press('3');await page.waitForFunction(()=>document.querySelector('[data-power=royal_edict]').getAttribute('aria-pressed')==='true')
 const canvas=await page.locator('.viewport canvas').boundingBox();await page.mouse.click(canvas.x+(544+512/3)/(768*16/9)*canvas.width,canvas.y+(768-371)/768*canvas.height)
 await page.waitForFunction(()=>window.royalObservation?.buffs.length===2)
 assert.deepEqual(await page.evaluate(()=>window.royalObservation.factors),[1.75,1.75])
 await page.waitForTimeout(300)
 const mask=page.locator('[data-power=royal_edict] [data-power-cooldown]');assert.equal(await mask.getAttribute('data-cooldown'),'50');await page.waitForFunction(()=>{const mask=document.querySelector('[data-power=royal_edict] [data-power-cooldown]');return mask&&Math.abs(parseFloat(mask.style.clipPath.match(/inset\(([-.\d]+)%/)?.[1])-(1-window.royalObservation.remaining/window.royalObservation.cooldown)*100)<.15})
 await page.screenshot({path:'analysis/web-royal-edict-start.png'})
 await page.waitForFunction(()=>window.royalObservation.buffs.every(b=>b.age>1.3));await page.screenshot({path:'analysis/web-royal-edict-tower-buffs.png'})
 await page.waitForFunction(()=>window.royalObservation.buffs.some(b=>b.remaining<.6));await page.screenshot({path:'analysis/web-royal-edict-fade.png'})
 await page.waitForFunction(()=>window.royalObservation.buffs.length===0);assert.deepEqual(await page.evaluate(()=>window.royalObservation.factors),[1,1])
 assert(await page.getByRole('button',{name:'皇家敕令',exact:true}).isDisabled())
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser royal-edict fixture: saved third slot and keyboard 3, real placement, original king/rug/area and tower buff EXOs, selected two towers gain1.75 then expire to1, cooldown remains; no asset/page errors. Native equipment-room UI remains pending.')
}finally{await browser.close()}
