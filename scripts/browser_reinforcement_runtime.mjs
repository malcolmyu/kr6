import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level01-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{const resources=performance.getEntriesByType('resource'),get=async name=>import(resources.find(r=>r.name.includes(`/src/game/${name}.ts`)).name),{WorldRenderer}=await get('WorldRenderer'),{GameSession}=await get('GameSession'),render=WorldRenderer.prototype.renderSoldiers,advance=GameSession.prototype.advance;WorldRenderer.prototype.renderSoldiers=function(){render.call(this);window.reinfWorld=this;window.reinfRenderedAt=this.session.time};GameSession.prototype.advance=function(dt){if(!window.reinfFreeze)advance.call(this,dt)};window.reinfAdvance=advance})
 await page.waitForFunction(()=>window.reinfWorld?.session);await page.getByRole('button',{name:'开始战斗',exact:true}).click();await page.waitForFunction(()=>window.reinfWorld.session.waves.wave===1)
 await page.evaluate(()=>{window.reinfFreeze=true;window.reinfGame=window.reinfWorld.session;window.reinfBefore=window.reinfGame.time})
 await page.keyboard.press('1');await page.waitForFunction(()=>document.querySelector('[data-power=reinforcements]').getAttribute('aria-pressed')==='true')
 const dest=await page.evaluate(()=>{const w=window.reinfWorld,p=w.projectPoint({x:570,y:330}),r=w.renderer.domElement.getBoundingClientRect();return{x:r.left+r.width*p.x/100,y:r.top+r.height*p.y/100}});await page.mouse.click(dest.x,dest.y)
 const queued=await page.evaluate(()=>({units:window.reinfGame.barracks.soldiers.filter(s=>s.name.startsWith('soldier_reinforcement')).length,control:window.reinfGame.entities.registry.pendingInserts.some(e=>e.template==='power_reinforcements_control')}));assert.deepEqual(queued,{units:0,control:true})
 async function step(seconds){await page.evaluate(seconds=>{const g=window.reinfGame;g.paused=false;window.reinfAdvance.call(g,seconds);g.paused=true},seconds);await page.waitForFunction(()=>window.reinfRenderedAt===window.reinfGame.time)}
 await step(1/30)
 const inserted=await page.evaluate(()=>{const g=window.reinfGame;window.reinfUnits=g.barracks.soldiers.filter(s=>s.name==='soldier_reinforcement_base');window.reinfOrigins=window.reinfUnits.map(s=>({...s.pos}));return window.reinfUnits.map(s=>({born:s.born,id:g.entities.entity(s)?.id,alpha:s.corpseAlpha,name:s.infoKey,now:g.time}))});assert.equal(inserted.length,2);assert(inserted.every(s=>s.id&&s.born===s.now&&s.alpha===0&&s.name.startsWith('SOLDIER_REINFORCEMENTS_')))
 await step(5/30)
 const fade=await page.evaluate(()=>window.reinfUnits.map(s=>({alpha:s.corpseAlpha,opacity:window.reinfWorld.soldierSprites.get(s.id).opacity})));assert(fade.every(s=>Math.abs(s.alpha-127.5)<1e-8&&Math.abs(s.opacity-.5)<1e-10));await page.screenshot({path:'analysis/web-reinforcement-native-fade-in.png'})
 await step(12.1)
 const expired=await page.evaluate(()=>window.reinfUnits.map(s=>({hp:s.hp,fade:s.fadeOutAt,alpha:s.corpseAlpha,opacity:window.reinfWorld.soldierSprites.get(s.id).opacity})));assert(expired.every(s=>s.hp===0&&s.fade!==undefined&&s.alpha>0&&s.alpha<255&&Math.abs(s.opacity-s.alpha/255)<1e-10));await page.screenshot({path:'analysis/web-reinforcement-native-fade-out.png'})
 await step(2)
 const corpses=await page.evaluate(()=>window.reinfUnits.map((s,i)=>({alpha:s.corpseAlpha,distance:Math.hypot(s.pos.x-window.reinfOrigins[i].x,s.pos.y-window.reinfOrigins[i].y),registered:!!window.reinfGame.entities.registry.entities.get(window.reinfGame.entities.entity(s).id)})));assert(corpses.every(s=>s.alpha===0&&Math.abs(s.distance-50)<1e-8&&s.registered))
 await step(10);assert(await page.evaluate(()=>window.reinfUnits.every(s=>!window.reinfGame.entities.registry.entities.get(window.reinfGame.entities.entity(s).id)&&!window.reinfWorld.soldierSprites.has(s.id))))
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser actual power button/canvas cast: control queued before units, next-flush IDs/names/birth, native10-frame rendered alpha, timed50-unit walk/fade, transparent corpse retention and health/renderer removal. Empty-wave fixture; no page/asset errors; not full3-2/video acceptance.')
}finally{await browser.close()}
