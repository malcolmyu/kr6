import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));await installReplayFixture(page)
 await page.goto('http://127.0.0.1:5173/');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=p=>performance.getEntriesByType('resource').find(r=>r.name.includes(p)).name,{GameSession}=await import(resource('/src/game/GameSession.ts')),{WorldRenderer}=await import(resource('/src/game/WorldRenderer.ts'))
  const render=WorldRenderer.prototype.renderTowers,build=GameSession.prototype.build,spawn=GameSession.prototype.spawn,step=GameSession.prototype.step,call=GameSession.prototype.callNextWave
  window.queueEvidence={history:[],created:[],inserted:[],calls:[]}
  WorldRenderer.prototype.renderTowers=function(){render.call(this);window.queueWorld=this;const s=this.session?.towers.sites.find(s=>s.id==='6'),visual=this.towerVisuals.get('6');if(s&&visual)window.queueEvidence.history.push({time:this.session.time,key:visual.key,start:s.buildStartsAt})}
  GameSession.prototype.build=function(id,kind){const result=build.call(this,id,kind);if(id==='6')window.queueEvidence.build={at:this.time,start:this.towers.sites.find(s=>s.id===id).buildStartsAt};return result}
  GameSession.prototype.spawn=function(command,time){const id=this.nextId,result=spawn.call(this,command,time);window.queueEvidence.created.push({id,tick:this.tick});return result}
  GameSession.prototype.step=function(dt){const known=new Set(this.enemies.map(e=>e.id));step.call(this,dt);for(const e of this.enemies)if(!known.has(e.id))window.queueEvidence.inserted.push({id:e.id,tick:this.tick})}
  GameSession.prototype.callNextWave=function(){const before=this.waves.wave,result=call.call(this);window.queueEvidence.calls.push({before,after:this.waves.wave});return result}
 })
 await page.waitForFunction(()=>window.queueWorld)
 const box=await page.locator('.viewport canvas').boundingBox(),point=await page.evaluate(()=>window.queueWorld.projectPoint(window.queueWorld.session.towers.sites.find(s=>s.id==='6').pos))
 await page.mouse.click(box.x+point.x/100*box.width,box.y+point.y/100*box.height);await confirmTowerAction(page,'弓箭塔 · 70')
 await page.waitForFunction(()=>window.queueEvidence.history.some(h=>h.key==='tower_build_archers'));await page.screenshot({path:'analysis/web-native-construction-queue.png'})
 await page.waitForFunction(()=>window.queueEvidence.history.some(h=>h.key==='tower_archers_lvl1'))
 const history=await page.evaluate(()=>window.queueEvidence),start=history.build.start
 assert(Math.abs(start-history.build.at-2/30)<1e-9);assert(history.history.filter(h=>h.time<start).every(h=>h.key!=='tower_build_archers'));assert(history.history.find(h=>h.key==='tower_build_archers').time>=start)
 assert(history.history.find(h=>h.key==='tower_archers_lvl1').time>start+.8)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click();await page.waitForFunction(()=>window.queueEvidence.inserted.length>0&&window.queueWorld.session.enemies.some(e=>{const p=window.queueWorld.projectPoint(e.path.position);return e.hp>0&&p.x>2&&p.x<98&&p.y>2&&p.y<98&&window.queueWorld.sprites.get(e.id)?.root.visible}))
 const evidence=await page.evaluate(()=>window.queueEvidence);assert(evidence.calls.length);assert(evidence.calls.every(e=>e.before===e.after),'summon handler does not synchronously execute wave commands')
 for(const e of evidence.inserted){const creation=evidence.created.find(c=>c.id===e.id);assert.equal(e.tick,creation.tick+1,'enemy insertion is next-tick')}
 await page.screenshot({path:'analysis/web-native-enemy-queue.png'});assert.deepEqual(errors,[]);assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser normal UI: original two-tick construction start, real holder/build/finished visuals, queued summon, next-tick enemy insertion and actual enemy sprites; no page errors')
}finally{await browser.close()}
