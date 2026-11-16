import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3,iron:true}}})))
 // This short original-format wave isolates the reward transition, not battle strategy.
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:300},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:1}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 assert.equal(await page.locator('[data-power]').count(),2)
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 assert.equal(await page.locator('[data-power]').count(),2)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click();const confirm=page.getByRole('button',{name:'确认出击',exact:true});if(await confirm.count())await confirm.click()
 await page.locator('.native-outcome').waitFor({timeout:20000})
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.progress.v1')))
 assert.equal(saved.levels[2].campaign,3);assert.deepEqual(saved.powers,['reinforcements','rain_of_fire','royal_edict'])
 await page.locator('.native-outcome').getByRole('button',{name:'继续',exact:true}).click()
 const map=page.locator('.native-map');await map.waitFor();await map.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await map.getByRole('button',{name:'钢铁挑战',exact:true}).click();await page.getByRole('button',{name:'战斗',exact:true}).click();await waitForGame(page)
 assert.equal(await page.locator('[data-power]').count(),3);assert(await page.getByRole('button',{name:'皇家敕令',exact:true}).isDisabled())
 await page.screenshot({path:'analysis/web-royal-edict-auto-equipped.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser reward transition fixture: four-star save has two powers; stage-two campaign outcome crosses five stars and saves native auto-equipped royal edict; continue through map to iron shows third native slot. No asset/page errors. Reward presentation/modal still awaits the full native map UI.')
}finally{await browser.close()}
