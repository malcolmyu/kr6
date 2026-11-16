import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});await installReplayFixture(page)
 await page.goto('http://127.0.0.1:5173/');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/WorldRenderer.ts')).name,{WorldRenderer}=await import(url),render=WorldRenderer.prototype.renderTowers;WorldRenderer.prototype.renderTowers=function(){render.call(this);window.buyWorld=this}})
 await page.waitForFunction(()=>window.buyWorld?.buyIndicators.size&&[...window.buyWorld.buyIndicators.values()].some(a=>a.root.visible&&a.mesh.material.opacity>.4))
 const initial=await page.evaluate(()=>{const w=window.buyWorld;w.session.paused=true;return{gold:w.session.gold,states:[...w.buyIndicators].map(([id,a])=>({id,visible:a.root.visible,alpha:a.mesh.material.opacity,scale:a.root.scale.x,offset:a.root.position.y-w.session.towers.sites.find(s=>s.id===id).pos.y}))}})
 assert.equal(initial.gold,245);assert(initial.states.every(s=>s.visible&&s.scale>=1.2&&s.scale<=1.3&&s.offset===10));await page.screenshot({path:'analysis/web-buy-available-pulse.png'});await page.evaluate(()=>window.buyWorld.session.paused=false)
 for(let i=0;i<3;i++){
  const target=await page.evaluate(()=>{const w=window.buyWorld,s=w.session.towers.sites.find(s=>!s.tower&&!s.building);return{id:s.id,point:w.projectPoint(s.pos)}}),box=await page.locator('.viewport canvas').boundingBox()
  await page.mouse.click(box.x+target.point.x/100*box.width,box.y+target.point.y/100*box.height);await confirmTowerAction(page,'弓箭塔 · 70')
  await page.waitForFunction(id=>window.buyWorld.session.towers.sites.find(s=>s.id===id).tower,target.id)
 }
 await page.waitForFunction(()=>window.buyWorld.session.gold===35&&[...window.buyWorld.buyIndicators.values()].every(a=>!a.root.visible))
 await page.screenshot({path:'analysis/web-buy-available-insufficient.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser normal UI: original shared gold/scale pulse appears on affordable holders; three actual70-gold builds hide all indicators at35 gold; original atlas, no page or asset errors')
}finally{await browser.close()}
