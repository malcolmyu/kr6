import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[],audio=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{window.comicSounds=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.comicSounds.push({at:performance.now(),duration:this.buffer?.duration});return start.apply(this,args)}})
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page)
 const comic=page.locator('.comic-screen');await comic.waitFor();await page.locator('.comic-hit').waitFor()
 const initialStep=await page.locator('.game-frame').getAttribute('data-tutorial-step')
 assert.equal(await page.locator('.native-pause').getAttribute('aria-pressed'),'true','Gameplay remains paused behind comic')
 await page.waitForFunction(()=>Number(document.querySelector('.comic-screen')?.getAttribute('data-frame'))>=170)
 assert.equal(await page.locator('.game-frame').getAttribute('data-tutorial-step'),initialStep)
 await page.screenshot({path:'analysis/web-comic-page1-mid.png'})
 await page.waitForFunction(()=>document.querySelector('.comic-screen')?.getAttribute('data-playing')==='false')
 assert.equal(await comic.getAttribute('data-comic-page'),'1')
 await page.screenshot({path:'analysis/web-comic-page1-complete.png'})
 await page.getByRole('button',{name:'漫画：点击继续',exact:true}).click()
 await page.locator('.comic-screen[data-comic-page="2"]').waitFor()
 await page.waitForFunction(()=>Number(document.querySelector('.comic-screen')?.getAttribute('data-frame'))>=160)
 await page.screenshot({path:'analysis/web-comic-page2-mid.png'})
 await page.getByRole('button',{name:'漫画：点击快进',exact:true}).click()
 await page.screenshot({path:'analysis/web-comic-page2-complete.png'})
 await page.getByRole('button',{name:'漫画：点击继续',exact:true}).click();await comic.waitFor({state:'hidden'})
 await page.waitForFunction(()=>document.querySelector('.game-frame')?.getAttribute('data-tutorial-step')==='build-tower')
 await page.screenshot({path:'analysis/web-comic-to-tutorial.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: original two-page comic images/Chinese text/transform animation, first page waits for click, .25s turn, second-page fast-forward, tutorial resumes; no missing assets or page errors')
}finally{await browser.close()}
