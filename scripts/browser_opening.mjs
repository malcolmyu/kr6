import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{
  window.__audioStartTimes=[]
  const original=AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start=function(...args){window.__audioStartTimes.push(performance.now());return original.apply(this,args)}
 })
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click()
 await page.waitForTimeout(2200)
 await page.screenshot({path:'analysis/web-opening.png'})
 await page.getByRole('button',{name:'点击开始',exact:true}).waitFor()
 await page.waitForTimeout(2400)
 await page.screenshot({path:'analysis/web-main-menu.png'})
 assert.deepEqual(errors,[])
 const times=await page.evaluate(()=>window.__audioStartTimes)
 assert(times.length>=2,'Splash audio and original main menu music must both play')
 assert(times[1]-times[0]>=8550&&times[1]-times[0]<=9200,'Splash uses actual native .2s initial timestamp, 2s hold and .33s fade; no added .2s delay')
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page)
 await page.locator('.game-frame[aria-busy="false"]').waitFor()
 assert.deepEqual(errors,[])
 console.log('Original opening, hold/fade timing, decoded splash/menu audio and transition verified')
}finally{await browser.close()}
