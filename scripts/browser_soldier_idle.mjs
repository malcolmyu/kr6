import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.log(e.stack)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.1;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level01-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{const resources=performance.getEntriesByType('resource'),get=async name=>import(resources.find(r=>r.name.includes(`/src/game/${name}.ts`)).name),{WorldRenderer}=await get('WorldRenderer'),{ExoSprite}=await get('ExoSprite'),render=WorldRenderer.prototype.renderSoldiers,animate=ExoSprite.prototype.animate;ExoSprite.prototype.animate=function(...args){animate.call(this,...args);this.idleFrameInput=args};WorldRenderer.prototype.renderSoldiers=function(){render.call(this);window.idleWorld=this;window.idleRenderedAt=this.session.time}})
 await page.waitForFunction(()=>window.idleWorld?.session.heroes.gerald)
 const flip=await page.evaluate(()=>{const w=window.idleWorld,g=w.session,h=g.heroes.gerald,c=g.barracks.idleStates.get(h);g.paused=true;const before=h.facingLeft;let previous=c.state.ts_counter;g.paused=false;for(let i=0;i<130&&h.facingLeft===before;i++){previous=c.state.ts_counter;g.advance(1/30)}g.paused=true;window.idleGame=g;window.idleHero=h;return{before,after:h.facingLeft,previous,counter:c.state.ts_counter,cooldown:c.state.cooldown}})
 assert.notEqual(flip.before,flip.after);assert(flip.previous<=flip.cooldown);assert(flip.previous+1/30>flip.cooldown);assert.equal(flip.counter,0)
 await page.waitForFunction(()=>window.idleRenderedAt===window.idleGame.time)
 const view=await page.evaluate(()=>{const h=window.idleHero,w=window.idleWorld,a=w.soldierSprites.get(h.id);return{flip:h.facingLeft,scale:a.root.scale.x,input:a.idleFrameInput,clock:h.idleVisual.at,elapsed:w.session.time-h.idleVisual.at}})
 assert.equal(Math.sign(view.scale),view.flip?-1:1);assert.equal(view.input[0],'idle');assert.equal(view.input[1],view.elapsed);assert.equal(view.input[2],true);assert.equal(view.input[3],30)
 await page.screenshot({path:'analysis/web-native-hero-idle-flip.png'})
 await page.evaluate(()=>{const g=window.idleGame;g.paused=false;g.advance(1);g.paused=true})
 const beforeMove=await page.evaluate(()=>window.idleGame.barracks.idleStates.get(window.idleHero).state.ts_counter);assert(beforeMove>0)
 await page.evaluate(()=>window.idleGame.paused=false);await page.getByRole('button',{name:'杰拉尔德',exact:true}).click()
 const target=await page.evaluate(()=>{const w=window.idleWorld,h=window.idleHero,pos={x:h.pos.x+100,y:h.pos.y},p=w.projectPoint(pos),r=w.renderer.domElement.getBoundingClientRect();window.idleDestination=pos;return{x:r.left+r.width*p.x/100,y:r.top+r.height*p.y/100}});await page.mouse.click(target.x,target.y)
 await page.waitForFunction(()=>window.idleHero.moving);await page.evaluate(()=>window.idleGame.paused=true)
 const resumed=await page.evaluate(()=>{const g=window.idleGame,h=window.idleHero,c=g.barracks.idleStates.get(h);g.paused=false;for(let i=0;i<180;i++){g.advance(1/30);if(!h.deploying&&!h.moving&&c.state.ts===g.time)break}g.paused=true;return{pos:{...h.pos},rally:{...h.rally},destination:window.idleDestination,counter:c.state.ts_counter,at:c.state.ts,time:g.time}})
 assert.deepEqual(resumed.pos,resumed.rally);assert(Math.hypot(resumed.pos.x-resumed.destination.x,resumed.pos.y-resumed.destination.y)<1e-9,'canvas projection round-trip');assert.equal(resumed.counter,1/30);assert.equal(resumed.at,resumed.time);await page.waitForFunction(()=>window.idleRenderedAt===window.idleGame.time)
 await page.screenshot({path:'analysis/web-native-hero-idle-after-move.png'});assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: native strict idle threshold flips real hero EXO facing, idle uses preserved clock/native30FPS; actual portrait/canvas movement interrupts the counter and first resumed idle resets to one tick. Empty-wave fixture, no page/asset errors; video/audio equivalence not claimed.')
}finally{await browser.close()}
