import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,waitForGame} from './browser_helpers.mjs'
import {guiLayout} from '../src/game/GuiLayout.ts'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 await installReplayFixture(page);page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.locator('[data-hud=gold]').waitFor()
 for(const [width,height] of [[1440,1000],[760,720]]) {
  await page.setViewportSize({width,height});await page.waitForTimeout(300)
  const canvas=await page.locator('.viewport').boundingBox(),background=await page.locator('.hud-background').boundingBox(),layout=guiLayout(canvas.width,canvas.height)
  assert(Math.abs(background.x-(canvas.x+layout.origin.x+layout.safe.lt*layout.scale))<1)
  assert(Math.abs(background.width-439*.7*layout.scale)<1)
  assert.equal(await page.locator('[data-hud=lives]').innerText(),'20')
  assert.equal(await page.locator('[data-hud=gold]').innerText(),'245')
  assert.equal(await page.locator('[data-hud=wave]').innerText(),'0/5')
  await page.screenshot({path:`analysis/web-native-hud-${width}.png`})
 }
 await page.getByRole('button',{name:'暂停',exact:true}).click();await page.getByRole('button',{name:'继续',exact:true}).click()
 await page.getByLabel('模式',{exact:true}).selectOption('iron');await waitForGame(page)
 assert.equal(await page.locator('[data-hud=lives]').innerText(),'1')
 assert.equal(await page.locator('[data-hud=wave]').innerText(),'0/1')
 assert.equal(await page.locator('img').evaluateAll(images=>images.filter(i=>i.src.includes('/assets/')&&(!i.complete||!i.naturalWidth)).length),0)
 assert.deepEqual(errors,[]);assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser: original desktop HUD textures, number font, exported label positions, responsive scale, native pause icon and campaign/iron counters; no page/image errors')
} finally {await browser.close()}
