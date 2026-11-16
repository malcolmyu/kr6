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
  window.damageKnight=(await import(resource('SoldierHealth'))).damageSoldier
  window.knightOpacities=[];const setOpacity=AtlasSprite.prototype.setOpacity;AtlasSprite.prototype.setOpacity=function(value){window.knightOpacities.push(value);return setOpacity.call(this,value)}
  window.knightFrames=[];AtlasSprite.prototype.setFrame=function(name,...args){if(name.startsWith('knights_order_soldier_'))window.knightFrames.push(name);return setFrame.call(this,name,...args)}
 })
 const canvas=await page.locator('.viewport canvas').boundingBox();await page.mouse.click(canvas.x+(602+512/3)/(768*16/9)*canvas.width,canvas.y+(768-263)/768*canvas.height);await confirmTowerAction(page,'兵营 · 70');await page.waitForTimeout(2500)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click();await page.waitForFunction(()=>window.knightSession?.waves.wave>0)
 const attack=await page.evaluate(()=>{const g=window.knightSession;for(let i=0;i<1800&&!g.barracks.soldiers.some(s=>s.attack);i++)g.advance(1/30);const s=g.barracks.soldiers.find(s=>s.attack);if(!s)throw new Error('No real knight attack');g.advance(12/30);g.paused=true;window.observedKnight=s;return{time:g.time,target:s.target?.id,attack:s.attack?.attack.animation}})
 assert(attack.target);assert.equal(attack.attack,'attack');await page.waitForTimeout(200);assert((await page.evaluate(()=>window.knightFrames)).some(n=>n.includes('knights_order_soldier_lvl1_')))
 await page.screenshot({path:'analysis/web-knight-native-combat.png'})
 const fatal=await page.evaluate(()=>{const g=window.knightSession,s=window.observedKnight;window.damageKnight(s,{value:100000,damage_type:2},g.time);return{hp:s.hp,target:s.target?.id,death:s.diedAt,visual:s.visualOverride.name,id:g.entities.entity(s).id}})
 assert.equal(fatal.hp,0);assert(fatal.target);assert.equal(fatal.death,undefined);assert.equal(fatal.visual,'attack');await page.screenshot({path:'analysis/web-knight-fatal-retained.png'})
 const step=()=>page.evaluate(()=>{const g=window.knightSession,s=window.observedKnight;g.paused=false;g.advance(1/30);g.paused=true;return{hp:s.hp,target:s.target?.id,death:s.diedAt,attack:!!s.attack,visual:s.visualOverride.name,time:g.time}})
 const interrupted=await step();assert.equal(interrupted.target,fatal.target);assert.equal(interrupted.attack,false);assert.equal(interrupted.visual,'attack');assert.equal(interrupted.death,undefined)
 const death=await step();assert.equal(death.target,undefined);assert.equal(death.visual,'death');assert.equal(death.death,death.time);await page.waitForTimeout(200);await page.screenshot({path:'analysis/web-knight-native-death.png'})
 const fading=await page.evaluate(()=>{const g=window.knightSession,s=window.observedKnight;g.paused=false;for(let i=0;i<450&&(s.corpseAlpha===undefined||s.corpseAlpha>128);i++)g.advance(1/30);g.paused=true;return{alpha:s.corpseAlpha,present:g.barracks.soldiers.includes(s)}})
 assert(fading.present&&fading.alpha>0&&fading.alpha<128);await page.waitForTimeout(200);assert((await page.evaluate(()=>window.knightOpacities)).some(v=>Math.abs(v-fading.alpha/255)<1e-8));await page.screenshot({path:'analysis/web-knight-native-corpse-fade.png'})
 const removal=await page.evaluate(()=>{const g=window.knightSession,s=window.observedKnight,id=g.entities.entity(s).id;g.paused=false;for(let i=0;i<450&&s.removalQueuedAt===undefined;i++)g.advance(1/30);g.paused=true;return{time:g.time,deathHealthAt:s.deathHealthAt,queuedAt:s.removalQueuedAt,present:g.barracks.soldiers.includes(s),registered:!!g.entities.registry.entities.get(id),pending:g.entities.registry.pendingRemovals.some(e=>e.id===id)}})
 assert(Math.abs(removal.time-removal.deathHealthAt-12)<1/30+1e-8);assert.equal(removal.queuedAt,removal.time);assert(removal.present&&removal.registered&&removal.pending,'native fade queues corpse removal before next insertion phase')
 await step();assert.deepEqual(await page.evaluate(()=>{const g=window.knightSession,s=window.observedKnight;return{present:g.barracks.soldiers.includes(s),registered:!!g.entities.registry.entities.get(g.entities.entity(s).id)}}),{present:false,registered:false})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: UI-built knight fatal hit retains attack/target during health, next tick interrupts attack, following main tick releases target and renders death; corpse uses native tween opacity and completion before health fallback, queues removal near health death time and disappears from both real registry and soldier list on next tick. Accelerated controlled damage fixture; no page/asset errors, audible fidelity not verified.')
}finally{await browser.close()}
