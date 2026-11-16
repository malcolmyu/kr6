import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {skipComic} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 // Entry-only fixture executes the same original tutorial signal at the start.
 await page.route('**/data/level01-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:175},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'manual_wave',wave_name:'tutorial'},{name:'signal',signal_name:'kr6-tutorial-insert-hero',signal_params:['gerald','628','352']},{name:'wait',wait_time:999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click()
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page)
 await page.locator('.game-frame[aria-busy="false"]').waitFor();await skipComic(page)
 await page.getByLabel('剧情动画',{exact:true}).waitFor()
 await page.waitForTimeout(1800)
 await page.screenshot({path:'analysis/web-gerald-portal.png'})
 await page.getByLabel('剧情动画',{exact:true}).waitFor({state:'hidden',timeout:30000})
 await page.screenshot({path:'analysis/web-gerald-entered.png'})
 const canvas=await page.locator('.viewport canvas').boundingBox()
 await page.mouse.click(canvas.x+(628+512/3)/(768*16/9)*canvas.width,canvas.y+(768-352)/768*canvas.height)
 await page.mouse.click(canvas.x+(700+512/3)/(768*16/9)*canvas.width,canvas.y+(768-352)/768*canvas.height)
 await page.waitForTimeout(2200)
 await page.screenshot({path:'analysis/web-gerald-moved.png'})
 assert.deepEqual(errors,[]);assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser entry fixture: original portal/intro EXOs, curtains, delayed hero, EXO idle/walk and rally input; no render errors. Full hero gameplay remains pending.')
} finally {await browser.close()}
