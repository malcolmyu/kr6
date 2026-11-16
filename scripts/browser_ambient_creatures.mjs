import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.log(e.stack)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),get=async n=>import(resources.find(r=>r.name.includes(`/src/game/${n}.ts`)).name),{WorldRenderer}=await get('WorldRenderer'),{ExoSprite}=await get('ExoSprite'),{EnvironmentRenderer}=await get('EnvironmentRenderer'),render=WorldRenderer.prototype.renderTowers,animate=ExoSprite.prototype.animate,advance=EnvironmentRenderer.prototype.advance
  WorldRenderer.prototype.renderTowers=function(){render.call(this);window.ambientWorld=this}
  ExoSprite.prototype.animate=function(...args){animate.call(this,...args);this.ambientFrameInput=args}
  EnvironmentRenderer.prototype.advance=function(time){advance.call(this,time);window.ambientRenderedAt=time}
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.ambientWorld?.session.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))
 await page.evaluate(()=>{const w=window.ambientWorld,g=w.session;g.paused=true;window.ambientGame=g;window.ambientSheep=g.creatures.models.find(m=>m.name==='decal_stage_03_sheep');window.ambientCow=g.creatures.models.find(m=>m.name==='decal_stage_03_cow');const sound=g.creatures.onSound;window.ambientSounds=[];g.creatures.onSound=n=>{window.ambientSounds.push(n);sound(n)};g.paused=false;for(let i=0;i<230&&window.ambientSheep.animation!=='eat';i++)g.advance(1/30);g.advance(3/30);g.paused=true})
 await page.waitForFunction(()=>window.ambientRenderedAt===window.ambientGame.time)
 const state=()=>page.evaluate(()=>{const m=window.ambientSheep,w=window.ambientWorld,p=w.environment.parts.find(p=>p.model===m);window.ambientSheepArt=p.art;return{animation:m.animation,input:p.art.ambientFrameInput,elapsed:w.session.time-m.at,visible:p.art.root.visible,pos:{x:p.art.root.position.x,y:p.art.root.position.y},modelPos:m.pos}})
 const eat=await state();assert.equal(eat.animation,'eat');assert.equal(eat.visible,true);assert.equal(eat.input[0],'eat');assert.equal(eat.input[1],eat.elapsed);assert.equal(eat.input[2],false);assert.equal(eat.input[3],30);assert.deepEqual(eat.pos,eat.modelPos)
 await page.screenshot({path:'analysis/web-native-sheep-eat.png'})
 async function clickModel(key){const p=await page.evaluate(key=>{const w=window.ambientWorld,m=window[key],p=w.projectPoint(m.pos),r=w.renderer.domElement.getBoundingClientRect();w.session.paused=false;return{x:r.left+r.width*p.x/100,y:r.top+r.height*p.y/100}},key);await page.mouse.click(p.x,p.y)}
 for(let taps=1;taps<=5;taps++){await clickModel('ambientSheep');await page.waitForFunction(n=>window.ambientSheep.taps===n,taps);await page.evaluate(()=>window.ambientGame.paused=true)}
 assert.equal(await page.evaluate(()=>window.ambientSheep.phase),'death');await page.waitForFunction(()=>window.ambientRenderedAt===window.ambientGame.time);await page.screenshot({path:'analysis/web-native-sheep-death.png'})
 await page.evaluate(()=>{const g=window.ambientGame;g.paused=false;for(let i=0;i<120&&window.ambientSheep.removalQueuedAt===undefined;i++)g.advance(1/30);g.paused=true})
 const queued=await page.evaluate(()=>{const g=window.ambientGame,m=window.ambientSheep,e=g.entities.entity(m);return{pending:g.entities.registry.pendingRemovals.includes(e),registered:!!g.entities.registry.entities.get(e.id),model:g.creatures.models.includes(m)}});assert.deepEqual(queued,{pending:true,registered:true,model:true})
 await page.evaluate(()=>{const g=window.ambientGame;g.paused=false;g.advance(1/30);g.paused=true});await page.waitForFunction(()=>window.ambientSheepArt.root.parent===null);assert.equal(await page.evaluate(()=>window.ambientGame.creatures.models.includes(window.ambientSheep)),false)
 await clickModel('ambientCow');await page.waitForFunction(()=>window.ambientCow.phase==='action');await page.evaluate(()=>window.ambientGame.paused=true);await page.evaluate(()=>{const g=window.ambientGame;g.paused=false;g.advance(1.2);g.paused=true});await page.waitForFunction(()=>window.ambientRenderedAt===window.ambientGame.time);assert.equal(await page.evaluate(()=>window.ambientCow.phase),'action');await page.screenshot({path:'analysis/web-native-cow-abduction.png'})
 const actionAt=await page.evaluate(()=>window.ambientCow.at)
 await page.evaluate(()=>{const g=window.ambientGame;g.paused=false;for(let i=0;i<300&&window.ambientCow.phase!=='done';i++)g.advance(1/30);g.paused=true});await page.waitForFunction(()=>window.ambientRenderedAt===window.ambientGame.time)
 const cow=await page.evaluate(()=>{const m=window.ambientCow,p=window.ambientWorld.environment.parts.find(p=>p.model===m);return{animation:m.animation,at:m.at,input:p.art.ambientFrameInput,sounds:window.ambientSounds}})
 assert.equal(cow.animation,'idle_symbol');assert.equal(cow.at,actionAt);assert.equal(cow.input[0],'idle_symbol');assert.equal(cow.input[2],true);assert.equal(cow.input[3],30);assert.deepEqual(cow.sounds,['Stage03SheepExplosion','Stage03CowAbductionCast']);assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser actual pointer interactions: native sheep eating/EXO frame clock, five-tap death with retained queued body/next-flush model+entity+renderer cleanup, cow abduction/retained loop clock and both sound requests. Empty-wave fixture, no page/asset errors; heard/video fidelity not claimed.')
}finally{await browser.close()}
