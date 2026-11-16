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
 const started=await page.evaluate(()=>{const g=window.knightSession;for(let i=0;i<1800&&!g.enemies.some(e=>e.meleeAttack);i++)g.advance(1/30);const e=g.enemies.find(e=>e.meleeAttack);if(!e)throw new Error('No real enemy melee');window.observedEnemy=e;const source=g.towers.sites.find(site=>site.id===g.barracks.soldiers.find(s=>s.id===e.meleeAttack.targetId).siteId);for(const s of g.barracks.soldiers)if(s.siteId===source.id){g.barracks.releaseKnight(s);s.scriptLocked=true;}g.advance(1/30);g.paused=true;return{target:e.meleeAttack?.targetId,holding:e.meleeHolding,position:{...e.path.position},blockers:g.barracks.soldiers.filter(s=>s.target===e).length}})
 assert(started.target);assert(started.holding);assert.equal(started.blockers,0,'declared native unblock detaches all blockers; the controlled lock prevents reacquisition during this visual fixture');await page.waitForTimeout(200);await page.screenshot({path:'analysis/web-enemy-melee-retained.png'})
 const finished=await page.evaluate(()=>{const g=window.knightSession,e=window.observedEnemy;g.paused=false;for(let i=0;i<80&&e.meleeAttack;i++)g.advance(1/30);g.paused=true;return{position:{...e.path.position},holding:e.meleeHolding,visual:e.visualOverride,time:g.time}})
 assert.deepEqual(finished.position,started.position);assert(finished.holding);assert.equal(finished.visual.name,'idle');assert.equal(finished.visual.loop,true);await page.waitForTimeout(200);await page.screenshot({path:'analysis/web-enemy-melee-idle.png'})
 const step=()=>page.evaluate(()=>{const g=window.knightSession,e=window.observedEnemy;g.paused=false;g.advance(1/30);g.paused=true;return{position:{...e.path.position},holding:e.meleeHolding,visual:e.visualOverride}})
 const exit=await step();assert.deepEqual(exit.position,started.position);assert(exit.holding,'outer loop yields after rejecting its old target')
 const walking=await step();assert.notDeepEqual(walking.position,started.position);assert.equal(walking.holding,false);assert.equal(walking.visual.name,'walkingRightLeft');await page.waitForTimeout(200);await page.screenshot({path:'analysis/web-enemy-melee-resumed.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: UI-built knights and real wave bandit; declared native unblock plus lock removes blockers, native enemy attack retains target and position until animation completion, then idle/outer yield precedes actual walking atlas frame. No page/asset errors; simulation accelerated and audible timing not verified.')
}finally{await browser.close()}
