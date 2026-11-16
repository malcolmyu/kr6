import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 const profile=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress)
 async function menu(){await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.locator('[data-slot-state="open"]').waitFor()}
 async function settled(){await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'})}
 async function normalGame(){await page.locator('.game-frame[aria-busy="false"]').waitFor();await settled();assert.equal(await page.locator('.comic-screen').count(),0,'returning save skips opening comic');assert.equal(await page.locator('.tutorial-overlay').count(),0);assert.equal(await page.locator('.game-frame').getAttribute('data-tutorial-step'),null);await page.getByRole('button',{name:'开始战斗',exact:true}).waitFor()}
 async function captureSession(){await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),advance=GameSession.prototype.advance;GameSession.prototype.advance=function(dt){advance.call(this,dt);window.persistenceSession=this}});await page.waitForFunction(()=>window.persistenceSession)}
 await page.goto('http://127.0.0.1:5173/');await menu();await page.getByRole('button',{name:'选择存档 1',exact:true}).click();await page.locator('.comic-screen').waitFor();await settled()
 assert.deepEqual((await profile()).levels,{});assert.equal((await profile()).onboarding.stage1,true,'entry saved before the guide finishes');await page.screenshot({path:'analysis/web-progress-first-entry.png'})
 // Deliberately reload midway through the opening; no victory or tutorial completion is injected.
 await page.reload();await menu();await selectDefaultSlot(page);await normalGame();assert.equal(await page.locator('[data-hud=gold]').innerText(),'245');assert.deepEqual((await profile()).levels,{})
 await captureSession();assert.equal(await page.evaluate(()=>!!window.persistenceSession.tutorial),false);assert.deepEqual(await page.evaluate(()=>window.persistenceSession.heroes.team.map(h=>h.name)),['hero_gerald'],'guide-seen flag must not unlock Zefira');assert.equal(await page.evaluate(()=>window.persistenceSession.towers.sites.find(s=>s.id==='5').tower),undefined)
 await page.evaluate(()=>{window.persistenceSession.heroes.team[0].xp=321});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress.heroes?.hero_gerald===321)
 await page.screenshot({path:'analysis/web-progress-return-no-guide.png'})
 await page.reload();await menu();await selectDefaultSlot(page);await normalGame();await captureSession();assert.equal(await page.evaluate(()=>window.persistenceSession.heroes.team.find(h=>h.name==='hero_gerald').xp),321)
 // pagehide path persists immediately, before the next periodic five-second save.
 await page.evaluate(()=>{window.persistenceSession.heroes.team.find(h=>h.name==='hero_gerald').xp=333;window.dispatchEvent(new PageTransitionEvent('pagehide'))});assert.equal((await profile()).heroes.hero_gerald,333)
 await page.reload();await menu();await page.getByRole('button',{name:'选择存档 2',exact:true}).click();await page.locator('.comic-screen').waitFor();await settled();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.2.v1')).progress.heroes),undefined,'new slot must not inherit XP');assert.equal((await profile()).heroes.hero_gerald,333)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 const legacy=await browser.newPage({viewport:{width:1440,height:1000}});legacy.setDefaultTimeout(45000);legacy.on('pageerror',e=>errors.push(e.message));await legacy.addInitScript(()=>{if(!localStorage.getItem('kingdom-rush-6.progress.v1'))localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{}}))})
 await legacy.goto('http://127.0.0.1:5173/');await legacy.getByRole('button',{name:'开始游戏',exact:true}).click();await legacy.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(legacy);await legacy.locator('.game-frame[aria-busy="false"]').waitFor();await legacy.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'});assert.equal(await legacy.locator('.comic-screen').count(),0);assert.equal(await legacy.locator('.game-frame').getAttribute('data-tutorial-step'),null);assert.deepEqual(await legacy.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress.levels),{});assert.deepEqual(errors,[])
 console.log('Browser: fresh guide entry saved immediately; reload midway skips guide/comic without fake victory; five-second XP autosave and pagehide save survive reload/rehydration; new slot isolation and old zero-star save migration verified')
}finally{await browser.close()}
