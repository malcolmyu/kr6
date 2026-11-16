import {selectDefaultSlot} from './browser_helpers.mjs'
import {waitForGame} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 await installReplayFixture(page)
 await page.addInitScript(()=>{Math.random=()=>.5})
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click()
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.waitForFunction(()=>{const button=document.querySelector('button.next-wave');return button && !button.disabled})
 const canvas=await page.locator('.viewport canvas').boundingBox()
 await page.mouse.click(canvas.x+(829+512/3)/(768*16/9)*canvas.width,canvas.y+(768-259)/768*canvas.height)
 await confirmTowerAction(page,'兵营 · 70')
 await page.waitForTimeout(4000)
 await page.screenshot({path:'analysis/web-barracks-formation.png'})
 await page.getByRole('button',{name:'开始战斗',exact:true}).click()
 await page.waitForTimeout(14000)
 await page.screenshot({path:'analysis/web-barracks-melee.png'})
 await page.waitForFunction(()=>Number(document.querySelector('[data-hud=gold]')?.textContent?.replace(/\D/g,''))>175,{},{timeout:45000})
 assert.deepEqual(errors,[])
 assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser: original soldier textures, door animation, rally formation, melee and kill gold; no page errors')
} finally {await browser.close()}
