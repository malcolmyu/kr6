import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=p=>performance.getEntriesByType('resource').find(r=>r.name.includes(p)).name,{GameSession}=await import(resource('/src/game/GameSession.ts')),{WorldRenderer}=await import(resource('/src/game/WorldRenderer.ts')),advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderTowers
  GameSession.prototype.advance=function(dt){advance.call(this,dt);if(this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))window.deathSession=this}
  WorldRenderer.prototype.renderTowers=function(){render.call(this);window.deathWorld=this}
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.deathSession&&window.deathWorld)
 const kill=async(name,type)=>page.evaluate(({name,type})=>{
  const g=window.deathSession;g.heroes.team.forEach(h=>h.scriptLocked=true);g.towers.sites.forEach(s=>s.attackDisabled=true)
  g.spawnCinematicEnemy(name,1,{x:650,y:430});const e=g.enemies.at(-1);e.frozen=true;e.hp=10000;e.template.health.hp_max=10000
  g.paused=false;g.advance(1/30);g.combat.queueHit({enemy:e,damage:{value:100000,damage_type:type}});g.advance(1/30);g.paused=true;window.deathEnemy=e
  return{hp:e.hp,started:e.deathStartedAt,time:g.time}
 },{name,type})
 const step=async()=>page.evaluate(()=>{const g=window.deathSession;g.paused=false;g.advance(1/30);g.paused=true;return g.time})
 const fatal=await kill('enemy_bandit',4);assert.equal(fatal.hp,0);assert.equal(fatal.started,undefined)
 const start=await step();assert.equal(await page.evaluate(()=>window.deathEnemy.deathStartedAt),start)
 assert(await page.evaluate(()=>window.deathSession.entities.registry.pendingInserts.some(e=>e.template==='decal_blood_pool')));assert.equal(await page.evaluate(()=>window.deathWorld.bloodRenderer.sprites.size),0)
 await step();await page.waitForTimeout(150)
 assert(await page.evaluate(()=>{const g=window.deathSession,b=g.enemyDeaths.blood[0],art=window.deathWorld.bloodRenderer.sprites.get(b);return !!g.entities.registry.entities.get(g.entities.entity(b).id)&&art?.root.visible&&art.mesh.material.opacity===1}));await page.screenshot({path:'analysis/web-enemy-native-death-blood.png'})
 const fade=await page.evaluate(()=>{const g=window.deathSession,e=window.deathEnemy;g.paused=false;for(let i=0;i<180&&(e.corpseAlpha===undefined||e.corpseAlpha>128);i++)g.advance(1/30);g.paused=true;return{alpha:e.corpseAlpha,registered:!!g.entities.registry.entities.get(g.entities.entity(e).id)}})
 assert(fade.registered&&fade.alpha>0&&fade.alpha<128);await page.waitForTimeout(150)
 assert(Math.abs((await page.evaluate(()=>window.deathWorld.sprites.get(window.deathEnemy.id).mesh.material.opacity))-fade.alpha/255)<1e-10);await page.screenshot({path:'analysis/web-enemy-native-corpse-fade.png'})
 await page.evaluate(()=>{const g=window.deathSession,e=window.deathEnemy;g.paused=false;for(let i=0;i<30&&e.deathRemovalQueuedAt===undefined;i++)g.advance(1/30);g.paused=true})
 assert(await page.evaluate(()=>{const g=window.deathSession,e=window.deathEnemy;return g.enemies.includes(e)&&g.entities.registry.pendingRemovals.includes(g.entities.entity(e))}))
 await step();await page.waitForTimeout(150);assert(await page.evaluate(()=>{const g=window.deathSession,e=window.deathEnemy;return !g.enemies.includes(e)&&!g.entities.registry.entities.get(g.entities.entity(e).id)&&!window.deathWorld.sprites.has(e.id)&&g.enemyDeaths.blood.length===1}))
 await page.evaluate(()=>{const g=window.deathSession,b=g.enemyDeaths.blood[0];window.deathBlood=b;g.paused=false;for(let i=0;i<100&&b.removalQueuedAt===undefined;i++)g.advance(1/30);g.paused=true})
 assert(await page.evaluate(()=>{const g=window.deathSession,b=window.deathBlood;return b.alpha===0&&g.entities.registry.pendingRemovals.includes(g.entities.entity(b))}));await step();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.deathWorld.bloodRenderer.sprites.size),0)
 await kill('enemy_blackguard',8);await step();assert(await page.evaluate(()=>window.deathEnemy.deathHidden));await step();await page.waitForTimeout(150)
 assert(await page.evaluate(()=>{const w=window.deathWorld;return !w.sprites.get(window.deathEnemy.id).root.visible&&w.bloodRenderer.effectSprites.size>0}));await page.screenshot({path:'analysis/web-enemy-native-explosion.png'})
 await page.evaluate(()=>{const g=window.deathSession;g.paused=false;g.advance(50/30);g.paused=true})
 await kill('enemy_shadow_blades',2048);await step();await step()
 const fx=await page.evaluate(()=>{const g=window.deathSession,fx=[...g.enemyDeaths.effectModels].find(e=>e.name==='fx_enemy_desintegrate_KR5');window.deathFx=fx;g.paused=false;for(let i=0;i<45&&fx.alpha>=128;i++)g.advance(1/30);g.paused=true;return{alpha:fx.alpha,hidden:window.deathEnemy.deathHidden}})
 assert(fx.hidden&&fx.alpha>0&&fx.alpha<128);await page.waitForTimeout(150);assert(Math.abs((await page.evaluate(()=>window.deathWorld.bloodRenderer.effectSprites.get(window.deathFx).mesh.material.opacity))-fx.alpha/255)<1e-10);await page.screenshot({path:'analysis/web-enemy-native-disintegrate.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: actual registered enemy takes queued lethal damage, starts death next main tick, shows native blood next insertion, fades/removes corpse then blood from registry/models/render; explosion hides corpse with original FX and disintegration keeps/fades original FX. Declared static/empty-wave fixture; no page/asset errors, audible fidelity unverified.')
}finally{await browser.close()}
