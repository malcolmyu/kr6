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
 await page.evaluate(async()=>{const resources=performance.getEntriesByType('resource'),url=resources.find(r=>r.name.includes('/src/game/GameSession.ts')).name,worldUrl=resources.find(r=>r.name.includes('/src/game/WorldRenderer.ts')).name,{GameSession}=await import(url),{WorldRenderer}=await import(worldUrl),{ExoSprite}=await import(resources.find(r=>r.name.includes('/src/game/ExoSprite.ts')).name),animate=ExoSprite.prototype.animate,advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderTowers;ExoSprite.prototype.animate=function(...args){animate.call(this,...args);this.meleeFrameInput=args};WorldRenderer.prototype.renderTowers=function(){render.call(this);window.meleeWorld=this};GameSession.prototype.advance=function(dt){advance.call(this,dt);if(this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))window.meleeSession=this}})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.meleeSession)
 const arrived=await page.evaluate(()=>{
  const g=window.meleeSession,h=g.heroes.zefira
  g.heroes.gerald.scriptLocked=true;g.spawnCinematicEnemy('enemy_bandit',1,{x:600,y:350});const e=g.enemies.at(-1);Object.assign(e.path.position,{x:600,y:350});e.frozen=true;e.path.direction={x:-1,y:0};delete e.template.melee;e.hp=1000;e.template.health.hp_max=1000
  h.pos={x:564,y:350};h.rally={...h.pos};h.center={...h.pos};h.target=undefined;h.attack=undefined;h.deploying=false;h.scriptLocked=false;h.readyAt=0
  window.meleeEnemy=e;window.meleeDamagePhases=[];window.meleeSounds=[];const sound=g.barracks.onSound;g.barracks.onSound=name=>{window.meleeSounds.push({name,time:g.time});sound(name)}
  const main=g.entities.mainBindings.bind(g.entities);let active
  g.entities.mainBindings=function*(){for(const binding of main()){active=binding;yield binding;active=undefined}}
  const create=g.barracks.onDamageCreate,resolve=g.barracks.resolveDamage.bind(g.barracks)
  g.barracks.onDamageCreate=()=>{create();if(active?.model===h)window.meleeDamagePhases.push({phase:'main',owner:active.model.name,hp:e.hp,time:g.time})}
  g.barracks.resolveDamage=(time,enemies)=>{if(g.barracks.knightDamage.some(p=>p.soldier===h))window.meleeDamagePhases.push({phase:'before-health',hp:e.hp,time});resolve(time,enemies);if(window.meleeDamagePhases.at(-1)?.phase==='before-health')window.meleeDamagePhases.push({phase:'after-health',hp:e.hp,time})}
  g.advance(1/30);g.paused=true
  return{pos:{...h.pos},attack:!!h.attack,hp:e.hp,time:g.time}
 })
 assert.deepEqual(arrived.pos,{x:565,y:350});assert.equal(arrived.attack,false);assert.equal(arrived.hp,1000)
 const started=await page.evaluate(()=>{const g=window.meleeSession,h=g.heroes.zefira;g.paused=false;g.advance(1/30);g.paused=true;return{at:h.attack?.startedAt,time:g.time,hp:window.meleeEnemy.hp,animation:h.attack?.attack.animation}})
 assert.equal(started.at,started.time);assert.equal(started.animation,'attack_2');assert.equal(started.hp,1000);assert.equal(started.time,(Math.round(arrived.time*30)+1)*(1/30))
 await page.waitForTimeout(200);await page.screenshot({path:'analysis/web-hero-melee-after-arrival.png'})
 const hit=await page.evaluate(()=>{const g=window.meleeSession,e=window.meleeEnemy,h=g.heroes.zefira,at=h.attack.startedAt;g.paused=false;for(let i=0;i<30&&e.hp===1000;i++)g.advance(1/30);g.paused=true;return{time:g.time,at,hp:e.hp,hitTime:h.attack.attack.hit_time}})
 assert.equal(hit.hp,992);assert(hit.time-hit.at>=hit.hitTime);assert((Math.round(hit.time*30)-1)*(1/30)-hit.at<hit.hitTime)
 await page.waitForTimeout(200)
 const queuedFx=await page.evaluate(()=>{const g=window.meleeSession,m=g.nativeEffects.find(m=>m.name==='fx_zefira_hit'),entity=g.entities.entity(m),view=window.meleeWorld.effects.find(f=>f.model===m);window.meleeHitModel=m;return{phases:window.meleeDamagePhases,pos:m.pos,at:m.at,pending:g.entities.registry.pendingInserts.includes(entity),registered:!!g.entities.registry.entities.get(entity.id),visible:view?.art.root.visible}})
 assert.deepEqual(queuedFx.phases.map(p=>[p.phase,p.hp]),[['main',1000],['before-health',1000],['after-health',992]]);assert.equal(queuedFx.phases[0].owner,'hero_zefira');assert.deepEqual(queuedFx.pos,{x:595,y:370});assert.equal(queuedFx.at,hit.time);assert(queuedFx.pending);assert.equal(queuedFx.registered,false);assert.equal(queuedFx.visible,false)
 await page.evaluate(()=>{const g=window.meleeSession;g.paused=false;g.advance(1/30);g.paused=true})
 await page.waitForFunction(()=>window.meleeWorld.effects.find(f=>f.model===window.meleeHitModel)?.art.root.visible)
 const renderState=await page.evaluate(()=>{const g=window.meleeSession,m=window.meleeHitModel,v=window.meleeWorld.effects.find(f=>f.model===m);return{pos:{x:v.art.root.position.x,y:v.art.root.position.y},input:v.art.meleeFrameInput,elapsed:g.time-m.at,sounds:window.meleeSounds}})
 assert.deepEqual(renderState.pos,queuedFx.pos);assert.equal(renderState.input[0],'action');assert.equal(renderState.input[1],renderState.elapsed);assert.equal(renderState.input[2],false);assert.equal(renderState.input[3],30);assert.deepEqual(renderState.sounds,[{name:'MeleeSword',time:started.time}])
 await page.screenshot({path:'analysis/web-hero-melee-first-strike.png'})
 await page.evaluate(()=>{const g=window.meleeSession,h=g.heroes.zefira;h.scriptLocked=true;g.paused=false;for(let i=0;i<60;i++){const e=g.entities.entity(window.meleeHitModel);if(g.entities.registry.pendingRemovals.includes(e))break;g.advance(1/30)}g.paused=true})
 const finalFx=await page.evaluate(()=>{const g=window.meleeSession,m=window.meleeHitModel,e=g.entities.entity(m),v=window.meleeWorld.effects.find(f=>f.model===m);return{registered:!!g.entities.registry.entities.get(e.id),pending:g.entities.registry.pendingRemovals.includes(e),model:g.nativeEffects.includes(m),visible:v?.art.root.visible}})
 assert.deepEqual(finalFx,{registered:true,pending:true,model:true,visible:true})
 await page.evaluate(()=>{const g=window.meleeSession;g.paused=false;g.advance(1/30);g.paused=true})
 await page.waitForFunction(()=>!window.meleeWorld.effects.some(f=>f.model===window.meleeHitModel))
 assert.equal(await page.evaluate(()=>window.meleeSession.nativeEffects.includes(window.meleeHitModel)),false)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: actual third-stage hero walks final pixel to melee slot and yields, starts attack next tick, then queues damage at its own entity main without changing HP until health, deals8 on the native boundary, queues hit-FX hidden until insertion, retains it on timed removal request and cleans model/entity/render next flush. Declared stationary/empty-wave fixture; no page/asset errors; full hero coroutine and audible timing unverified.')
}finally{await browser.close()}
