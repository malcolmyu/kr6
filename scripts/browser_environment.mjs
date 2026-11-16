import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click()
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page)
 for(const [index,name] of ['1. 利尼维亚城堡','2. 奥术魔法学院','3. 遭受入侵的农田'].entries()) {
  if(index)await page.getByRole('button',{name,exact:true}).click()
  await page.locator('.game-frame[aria-busy="false"]').waitFor()
  assert.equal(await page.getByRole('alert').count(),0,await page.getByRole('alert').allTextContents())
  for(const mode of ['campaign','iron']) {
   if(mode==='iron') {
    await page.getByRole('combobox').selectOption(mode)
    await page.locator('.game-frame[aria-busy="false"]').waitFor()
   }
   await page.waitForTimeout(2000)
   await page.screenshot({path:`analysis/web-stage0${index+1}-environment${mode==='iron'?'-iron':''}.png`})
   assert.equal(await page.getByRole('alert').count(),0,await page.getByRole('alert').allTextContents())
   assert.deepEqual(errors,[])
  }
  await page.getByRole('combobox').selectOption('campaign')
  await page.locator('.game-frame[aria-busy="false"]').waitFor()
 }
 console.log('Browser: all six campaign/iron environments, original stage decoration atlases and EXO animations render without errors')
} finally {await browser.close()}
