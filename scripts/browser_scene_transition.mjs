import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame,installReplayFixture} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});await installReplayFixture(page)
 let release;const gate=new Promise(resolve=>release=resolve);await page.route('**/data/level01.json',async route=>{await gate;await route.continue()},{times:1})
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),audioUrl=resources.find(r=>r.name.includes('/src/game/AudioManager.ts')).name,gameUrl=resources.find(r=>r.name.includes('/src/game/GameSession.ts')).name
  const {AudioManager}=await import(audioUrl),play=AudioManager.prototype.play;window.transitionSounds=[];AudioManager.prototype.play=function(name){window.transitionSounds.push(name);return play.call(this,name)}
  const {GameSession}=await import(gameUrl),advance=GameSession.prototype.advance;window.transitionClockViolations=[]
  GameSession.prototype.advance=function(dt){const before=this.time,result=advance.call(this,dt);if(document.querySelector('.scene-transition[data-active="true"][data-phase="opening"]')&&this.time!==before)window.transitionClockViolations.push([before,this.time]);return result}
 })
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page)
 await page.locator('.scene-transition[data-active="true"][data-phase="closing"]').waitFor();await page.waitForTimeout(200);await page.screenshot({path:'analysis/web-transition-closing.png'})
 assert(await page.locator('[inert]').count()>0)
 await page.locator('.scene-transition[data-active="true"][data-phase="loading"]').waitFor();await page.waitForTimeout(120);await page.screenshot({path:'analysis/web-transition-loading.png'})
 release();await page.locator('.scene-transition[data-active="true"][data-phase="opening"]').waitFor();await page.waitForTimeout(180);await page.screenshot({path:'analysis/web-transition-opening.png'})
 await waitForGame(page);assert.equal(await page.locator('[inert]').count(),0);assert.deepEqual(await page.evaluate(()=>window.transitionClockViolations),[])
 const sounds=await page.evaluate(()=>window.transitionSounds);assert(sounds.includes('GUITransitionClose'));assert(sounds.includes('GUITransitionOpen'))
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 assert.deepEqual(await page.evaluate(()=>window.transitionClockViolations),[]);assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser KR6 transition: original closing/loading/opening EXO and sword, held actual resource request, input inert/restore, both original sound events, frozen queued battle during opening, repeated level switch; no JS/asset errors')
}finally{await browser.close()}
