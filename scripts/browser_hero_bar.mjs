import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await installReplayFixture(page)
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 assert.equal(await page.locator('.hero-portrait').count(),2)
 await page.getByRole('button',{name:'杰拉尔德',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('[data-hero="杰拉尔德"]')?.getAttribute('aria-pressed')==='true')
 assert.equal(await page.locator('.next-wave').isDisabled(),true)
 await page.getByRole('button',{name:'杰拉尔德',exact:true}).click()
 assert.equal(await page.getByRole('button',{name:'援军',exact:true}).isDisabled(),true)
 await page.screenshot({path:'analysis/web-native-hero-bar-locked.png'})
 await page.getByRole('button',{name:'开始战斗',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('[data-power=reinforcements]').disabled)
 await page.waitForTimeout(500)
 await page.keyboard.press('1')
 await page.waitForFunction(()=>document.querySelector('[data-power=reinforcements]').getAttribute('aria-pressed')==='true')
 await page.screenshot({path:'analysis/web-native-hero-bar-ready.png'})
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click()
 await page.getByLabel('剧情动画',{exact:true}).waitFor()
 await page.waitForTimeout(3200)
 await page.screenshot({path:'analysis/web-zefira-teleport.png'})
 await waitForGame(page)
 await page.waitForFunction(()=>document.querySelectorAll('.hero-portrait').length===2)
 await page.screenshot({path:'analysis/web-zefira-introduced.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: two native hero portraits, selection mutes wave flag, first-wave power lock/unlock, keyboard power selection, stage-two cinematic/teleport/portrait reveal; no asset or page errors')
}finally{await browser.close()}
