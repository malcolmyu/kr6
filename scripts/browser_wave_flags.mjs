import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 await installReplayFixture(page);page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/data/level01-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:100},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'spawn',wait_time:1,spawns:[{enemy:'enemy_bandit',pi:1,spi:1}]},{name:'spawn',wait_time:1,spawns:[{enemy:'enemy_bandit',pi:1,spi:2}]},{name:'wave',wait_time:5},{name:'spawn',spawns:[{enemy:'enemy_bandit',pi:1,spi:3}]},{name:'wave',wait_time:5},{name:'spawn',spawns:[{enemy:'enemy_crow',pi:1,spi:1}]}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.waitForTimeout(300)
 const flag=page.locator('[data-wave-flag="1"]'),canvas=await page.locator('.viewport').boundingBox(),box=await flag.boundingBox()
 assert(box.x>canvas.x+canvas.width*.8,'First entrance flag must be on the original right-hand road')
 assert.equal(await page.getByRole('button',{name:'火雨',exact:true}).isDisabled(),true)
 await page.screenshot({path:'analysis/web-native-wave-ready.png'})
 await page.getByRole('button',{name:'开始战斗',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('[data-hud=wave]')?.dataset.wave==='1')
 assert.equal(await page.locator('.next-wave').count(),0,'No call button while the original spawn commands are still running')
 await page.getByRole('button',{name:'下一波',exact:true}).waitFor()
 await page.getByRole('button',{name:'火雨',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('.next-wave')?.disabled)
 assert.equal(await page.locator('.wave-flags').evaluate(el=>getComputedStyle(el).opacity),'0.2')
 await page.getByRole('button',{name:'火雨',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('.next-wave')?.disabled)

 const goldBefore=Number(await page.locator('[data-hud=gold]').innerText()),button=page.getByRole('button',{name:'下一波',exact:true})
 const reward=Number((await button.getAttribute('title')).match(/\d+/)[0])
 await page.screenshot({path:'analysis/web-native-wave-countdown.png'})
 await button.click()
 await page.waitForFunction(()=>document.querySelector('[data-hud=wave]')?.dataset.wave==='2')
 assert(Math.abs(Number(await page.locator('[data-hud=gold]').innerText())-goldBefore-reward)<=1,'Actual call awards the original rounded countdown reward')
 await page.waitForFunction(()=>document.querySelector('.wave-flag .icon')?.src.includes('waveFlag_0002'))
 await page.screenshot({path:'analysis/web-native-flying-wave.png'})
 assert.deepEqual(errors,[]);assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser wave fixture: original road entrance skull/arrow/pulse, no call during spawn commands, next-wave countdown and actual early gold reward; no page errors')
} finally {await browser.close()}
