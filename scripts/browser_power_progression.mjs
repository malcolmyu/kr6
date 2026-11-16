import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{if(!localStorage.getItem('kingdom-rush-6.progress.v1'))localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},powers:['reinforcements','rain_of_fire','royal_edict'],powerXp:{reinforcements:0,rain_of_fire:5900,royal_edict:0}}))})
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 async function enter(){await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page);await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)}
 const profile=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress)
 const levels=()=>page.locator('[data-power-level]').allTextContents()
 await page.goto('http://127.0.0.1:5173/?debug=1');await enter();assert.deepEqual(await levels(),['1','1','1'])
 const fraction=kind=>page.locator(`[data-power=${kind}] [data-power-xp]`).evaluate(el=>Number(el.style.transform.match(/scaleX\(([^)]+)\)/)[1]))
 assert(Math.abs(await fraction('rain_of_fire')-5900/6000)<1e-6)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click();const confirm=page.getByRole('button',{name:'确认出击',exact:true});if(await confirm.count())await confirm.click()
 const canvas=await page.locator('.viewport canvas').boundingBox(),point={x:canvas.x+(550+512/3)/(768*16/9)*canvas.width,y:canvas.y+(768-315)/768*canvas.height}
 for(const [key,kind] of [['1','reinforcements'],['2','rain_of_fire'],['3','royal_edict']]){
  await page.waitForFunction(kind=>!document.querySelector(`[data-power=${kind}]`).disabled,kind)
  await page.keyboard.press(key);await page.waitForFunction(kind=>document.querySelector(`[data-power=${kind}]`).getAttribute('aria-pressed')==='true',kind);await page.mouse.click(point.x,point.y)
  await page.locator(`[data-power=${kind}] [data-power-cooldown]`).waitFor()
 }
 assert.deepEqual(await levels(),['1','2','1']);assert(Math.abs(await fraction('rain_of_fire')-.03)<1e-6)
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress.powerXp?.rain_of_fire===6300)
 assert.deepEqual((await profile()).powerXp,{reinforcements:100,rain_of_fire:6300,royal_edict:320})
 await page.screenshot({path:'analysis/web-power-xp-level-up.png'})
 await page.reload();await enter();assert.deepEqual(await levels(),['1','2','1']);assert(Math.abs(await fraction('rain_of_fire')-.03)<1e-6);assert.deepEqual((await profile()).powerXp,{reinforcements:100,rain_of_fire:6300,royal_edict:320})
 await page.screenshot({path:'analysis/web-power-xp-reloaded.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: three original power XP bars/levels, normal keyboard/placement casts, natural rain level1→2 threshold, five-second per-slot save and reload rehydration pass; no page/asset errors')
}finally{await browser.close()}
