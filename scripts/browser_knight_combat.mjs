import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});await installReplayFixture(page)
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=name=>performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/'+name+'.ts')).name
  const {GameSession}=await import(resource('GameSession')),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){advance.call(this,dt);window.knightSession=this}
  const {AtlasSprite}=await import(resource('SpriteAtlas')),setFrame=AtlasSprite.prototype.setFrame
  window.knightFrames=[];AtlasSprite.prototype.setFrame=function(name,...args){if(name.startsWith('knights_order_soldier_'))window.knightFrames.push(name);return setFrame.call(this,name,...args)}
 })
 const canvas=await page.locator('.viewport canvas').boundingBox();await page.mouse.click(canvas.x+(602+512/3)/(768*16/9)*canvas.width,canvas.y+(768-263)/768*canvas.height);await confirmTowerAction(page,'兵营 · 70');await page.waitForTimeout(2500)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click();await page.waitForFunction(()=>window.knightSession?.waves.wave>0)
 const attack=await page.evaluate(()=>{const g=window.knightSession;for(let i=0;i<1800&&!g.barracks.soldiers.some(s=>s.attack);i++)g.advance(1/30);const s=g.barracks.soldiers.find(s=>s.attack);if(!s)throw new Error('No real knight attack');g.advance(12/30);g.paused=true;window.observedKnight=s;return{time:g.time,target:s.target?.id,attack:s.attack?.attack.animation}})
 assert(attack.target);assert.equal(attack.attack,'attack');await page.waitForTimeout(200);assert((await page.evaluate(()=>window.knightFrames)).some(n=>n.includes('knights_order_soldier_lvl1_')))
 await page.screenshot({path:'analysis/web-knight-native-combat.png'})
 const held=await page.evaluate(()=>{const g=window.knightSession,s=window.observedKnight;g.paused=false;for(let i=0;i<30&&s.attack;i++)g.advance(1/30);g.paused=true;return{attack:!!s.attack,visual:s.visualOverride,now:g.time}})
 assert.equal(held.attack,false);assert.equal(held.visual.name,'attack');assert.equal(held.visual.loop,false,'finished attack keeps its last frame during cooldown');await page.waitForTimeout(200);await page.screenshot({path:'analysis/web-knight-native-hold.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: real UI-built knights engage original wave enemies; native atlas attack frames render, completed attacks retain their non-looping final frame during cooldown; no page errors or missing assets. Simulation accelerated for this check; audible timing not verified.')
}finally{await browser.close()}
