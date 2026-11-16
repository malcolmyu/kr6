import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=p=>performance.getEntriesByType('resource').find(r=>r.name.includes(p)).name,{WorldRenderer}=await import(resource('/src/game/WorldRenderer.ts')),{GameSession}=await import(resource('/src/game/GameSession.ts')),{AudioManager}=await import(resource('/src/game/AudioManager.ts'))
  const render=WorldRenderer.prototype.renderTowers,advance=GameSession.prototype.advance,play=AudioManager.prototype.play
  window.fishingSounds=[];AudioManager.prototype.play=function(name){if(name.includes('Fisherman'))window.fishingSounds.push(name);return play.call(this,name)}
  WorldRenderer.prototype.renderTowers=function(){render.call(this);window.fishingWorld=this}
  GameSession.prototype.advance=function(dt){const visible=this.fishing.fishes.some(f=>!f.hidden&&f.canClick);advance.call(this,dt*(visible?1:10))}
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.fishingWorld?.session.fishing.bubble&&window.fishingWorld.fishingRenderer.sprites.has('bubble'))
 const initialGold=await page.evaluate(()=>window.fishingWorld.session.gold)
 for(let count=1;count<=5;count++){
  await page.waitForFunction(()=>{const f=window.fishingWorld.session.fishing;return f.phase!=='windup'&&f.fishes.some(s=>!s.hidden&&s.canClick&&s.removeAt===undefined)})
  const target=await page.evaluate(()=>{const w=window.fishingWorld,f=w.session.fishing.fishes.find(s=>!s.hidden&&s.canClick);return{key:f.key,point:w.projectPoint(f.pos),spriteVisible:w.fishingRenderer.sprites.get(f.key)?.root.visible}})
  assert.equal(target.spriteVisible,true)
  const box=await page.locator('.viewport canvas').boundingBox();await page.mouse.click(box.x+target.point.x/100*box.width,box.y+target.point.y/100*box.height)
  await page.waitForFunction(n=>window.fishingWorld.session.fishing.count===n,count)
  if(count===1){await page.waitForFunction(()=>[...window.fishingWorld.fishingRenderer.sprites.keys()].some(k=>k.startsWith('tap')));await page.screenshot({path:'analysis/web-fishing-first-catch.png'})}
 }
 await page.waitForFunction(()=>window.fishingWorld.session.fishing.completed)
 const final=await page.evaluate(()=>{const w=window.fishingWorld;return{gold:w.session.gold,count:w.session.fishing.count,found:w.session.fishing.found,bubble:w.fishingRenderer.sprites.has('bubble'),fishes:[...w.fishingRenderer.sprites.keys()].filter(k=>k.startsWith('fish')&&k!=='fisherman'),sounds:window.fishingSounds}})
 assert.equal(final.count,5);assert.equal(final.gold,initialGold+20);assert(final.found);assert(final.bubble);assert.deepEqual(final.fishes,[])
 assert.equal(final.sounds.filter(n=>n==='Stage03FishermanCatchFishFeedback').length,5);assert.equal(final.sounds.filter(n=>n==='Stage03FishermanSingle').length,2);assert.equal(final.sounds.filter(n=>n==='Stage03FishermanPile').length,3)
 await page.screenshot({path:'analysis/web-fishing-five-reward.png'});assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: normal third-stage fish canvas clicks, real jump/tap/fisherman/bubble EXOs, five catches and20gold, exact5feedback/2single/3pile audio triggers, fish cleanup and no page/asset errors; waits accelerated through fixed simulation steps, not full battle/video acceptance')
}finally{await browser.close()}
