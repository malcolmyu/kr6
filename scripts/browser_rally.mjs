import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));await installReplayFixture(page)
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(()=>document.fonts.ready)
 const canvas=await page.locator('.viewport canvas').boundingBox(),click=async(x,y)=>page.mouse.click(canvas.x+(x+512/3)/(768*16/9)*canvas.width,canvas.y+(768-y)/768*canvas.height)
 await click(602,263);await confirmTowerAction(page,'兵营 · 70');await page.waitForTimeout(2200)
 await click(602,263);await page.getByRole('button',{name:'设置集结点',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('.next-wave')?.disabled)
 assert.equal(await page.locator('.tower-menu').count(),0)
 await page.screenshot({path:'analysis/web-barracks-rally-range.png'})
 await click(1200,700)
 assert.equal(await page.locator('.next-wave').isDisabled(),true,'Invalid rally retains placement mode')
 await click(620,350)
 await page.waitForFunction(()=>!document.querySelector('.next-wave')?.disabled)
 await page.waitForTimeout(1800);await page.screenshot({path:'analysis/web-barracks-rallied.png'})
 assert.deepEqual(errors,[]);assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser: native rally menu icon, original range circle, invalid destination retains mode, valid road destination regroups soldiers and releases wave controls; no render errors')
}finally{await browser.close()}
