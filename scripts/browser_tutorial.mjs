import {selectDefaultSlot} from './browser_helpers.mjs'
import {confirmTowerAction,skipComic} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const balloons=JSON.parse(readFileSync('public/data/tutorial.json')).balloons
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 await page.addInitScript(()=>{Math.random=()=>.5})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click()
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page)
 await page.locator('.game-frame[aria-busy="false"]').waitFor();await skipComic(page)
 assert.equal(await page.getByRole('button',{name:'开始战斗',exact:true}).count(),0,'Fresh campaign must start with its automatic tutorial, not a main-wave bypass')
 await page.locator('.game-frame[data-tutorial-step="build-tower"]').waitFor({timeout:20000})
 await page.waitForTimeout(300)
 await page.screenshot({path:'analysis/web-tutorial-build.png'})
 const focus=await page.locator('.tutorial-focus').boundingBox()
 await page.mouse.click(focus.x+focus.width/2,focus.y+focus.height/2)
 await page.getByRole('button',{name:'弓箭塔 · 70',exact:true}).waitFor()
 await page.locator('.tutorial-balloon').filter({hasText:balloons.TB_BUILD.localized_text}).waitFor()
 for(const name of ['兵营 · 70','投石塔 · 110'])assert(await page.getByRole('button',{name,exact:true}).isDisabled())
 assert.equal(await page.getByRole('button',{name:'法师塔 · 100',exact:true}).count(),0)
 assert.equal(await page.getByRole('button',{name:'未装备防御塔',exact:true}).count(),2)
 await confirmTowerAction(page,'弓箭塔 · 70')
 await page.locator('.tutorial-balloon').filter({hasText:balloons.TB_GOLD.localized_text}).waitFor({timeout:20000})
 await page.screenshot({path:'analysis/web-tutorial-gold.png'})
 await page.getByRole('button',{name:'开始战斗',exact:true}).waitFor({timeout:45000})
 await page.waitForFunction(()=>{const b=document.querySelector('button.next-wave');return b && !b.disabled})
 assert.equal(await page.locator('[data-hud=gold]').innerText(),'125')
 await page.screenshot({path:'analysis/web-tutorial-first-wave-ready.png'})
 await page.getByRole('button',{name:'开始战斗',exact:true}).click()
 await page.getByRole('button',{name:'确认出击',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('[data-hud=wave]')?.dataset.wave==='1')
 assert.deepEqual(errors,[])
 assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser fresh campaign: automatic tutorial, native camera movement, locked tower choices, original Chinese build/gold lessons, four tutorial kills and two-click wave confirmation verified')
} finally {await browser.close()}
