import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const templates=JSON.parse(readFileSync('public/data/entities.json'))
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),url=resources.find(r=>r.name.includes('/src/game/GameSession.ts')).name,pathUrl=resources.find(r=>r.name.includes('/src/game/PathFollower.ts')).name,exoUrl=resources.find(r=>r.name.includes('/src/game/ExoSprite.ts')).name,audioUrl=resources.find(r=>r.name.includes('/src/game/AudioManager.ts')).name,{AudioManager}=await import(audioUrl),{GameSession}=await import(url),{PathFollower}=await import(pathUrl),{ExoSprite}=await import(exoUrl),advance=GameSession.prototype.advance,animate=ExoSprite.prototype.animate
  const registryUrl=resources.find(r=>r.name.includes('/src/game/RuntimeEntities.ts')).name,{RuntimeEntities}=await import(registryUrl),bindings=RuntimeEntities.prototype.mainBindings
  RuntimeEntities.prototype.mainBindings=function*(){for(const binding of bindings.call(this)){window.activeMainBinding=binding;yield binding;window.activeMainBinding=undefined}}
  window.projectileMainEvidence=[]
  const worldUrl=resources.find(r=>r.name.includes('/src/game/WorldRenderer.ts')).name,{WorldRenderer}=await import(worldUrl),renderTowers=WorldRenderer.prototype.renderTowers;WorldRenderer.prototype.renderTowers=function(){renderTowers.call(this);window.catapultWorld=this}
  const trigger=AudioManager.prototype.trigger;window.catapultSounds=[];AudioManager.prototype.trigger=function(name,...args){window.catapultSounds.push(name);return trigger.call(this,name,...args)};window.catapultRenderCalls=[];ExoSprite.prototype.animate=function(...args){if(args[3]!==undefined)window.catapultRenderCalls.push({name:args[0],fps:args[3]});return animate.apply(this,args)}
  GameSession.prototype.advance=function(dt){
   if(!this.catapultFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    this.catapultFixture=true
    const staticCreate=this.staticEffects.onCreate;window.craterQueues=[]
    this.staticEffects.onCreate=m=>{staticCreate(m);if(m.name==='decal_bomb_crater_KR5'){const entity=this.entities.entity(m);window.craterQueues.push({at:this.time,registered:!!this.entities.registry.entities.get(entity.id),pending:this.entities.registry.pendingInserts.includes(entity)})}}
    const update=this.combat.updateProjectiles.bind(this.combat),g=this
    this.combat.updateProjectiles=(time,actors,projectiles)=>{for(const p of projectiles){const entity=g.entities.entity(p);window.projectileMainEvidence.push({time,id:entity?.id,inOwnMain:window.activeMainBinding?.kind==='projectile'&&window.activeMainBinding.model===p,registered:!!entity&&!!g.entities.registry.entities.get(entity.id)})}return update(time,actors,projectiles)}
    this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
    const site=this.towers.sites.find(s=>s.id==='8'),pos={x:site.pos.x+110,y:site.pos.y+100};site.attackDisabled=false
    this.spawnCinematicEnemy('enemy_bandit',1,pos);const enemy=this.enemies.at(-1);enemy.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);enemy.hp=5000;enemy.template.health.hp_max=5000;enemy.template.motion.max_speed=0
    const shoot=this.combat.catapultTowers.onShoot;this.catapultShots=[];this.combat.catapultTowers.onShoot=(...args)=>{this.catapultShots.push({at:args[5],name:args[1],to:args[3]});shoot(...args)}
    window.catapultFixture={game:this,enemy,site,reposition:pos=>{enemy.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}])}}
   }
   advance.call(this,dt)
   if(this.catapultFixture){const state=this.combat.catapultTowers.states.get('8');window.catapultTowerObservation={time:this.time,key:state?.key,phase:state?.phase,direction:state?.direction,parts:state?.parts,shots:this.catapultShots,hp:window.catapultFixture.enemy.hp}}
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 const canvas=await page.locator('.viewport canvas').boundingBox(),point={x:canvas.x+(713+512/3)/(768*16/9)*canvas.width,y:canvas.y+(768-278)/768*canvas.height}
 await page.mouse.click(point.x,point.y);await confirmTowerAction(page,'投石塔 · 110')
 for(let level=1;level<=4;level++){
  if(level>1){
   await page.evaluate(level=>{const {site,reposition}=window.catapultFixture,delta=({2:[110,-90],3:[-110,-90],4:[-110,100]})[level];reposition({x:site.pos.x+delta[0],y:site.pos.y+delta[1]})},level)
   await page.mouse.click(point.x,point.y);await confirmTowerAction(page,`升级 · ${templates[`tower_catapult_lvl${level}`].tower.price}`)
  }
  await page.waitForFunction(level=>window.catapultTowerObservation?.key===`tower_catapult_lvl${level}`&&window.catapultTowerObservation.phase==='windup',level)
  assert.equal(await page.evaluate(()=>window.catapultTowerObservation.direction),level)
  await page.screenshot({path:`analysis/web-catapult-lvl${level}-direction${level}.png`})
  await page.waitForFunction(level=>window.catapultTowerObservation?.shots.some(s=>s.name===`bullet_catapult_lvl${level}`),level)
  if(level===1){
   await page.waitForFunction(()=>window.catapultFixture.game.combat.firebookTrails.trails.some(t=>t.kind==='catapult'&&t.particles.length>8))
   const trail=await page.evaluate(()=>{const w=window.catapultWorld,g=window.catapultFixture.game,t=g.combat.firebookTrails.trails.find(t=>t.kind==='catapult'),p=t.particles[0],art=w.firebookRenderer.trailSprites.get(p.id);g.paused=true;return{frame:p.frame,alpha:p.alpha,scale:p.scale,rotation:p.rotation,pos:p.pos,render:art&&{pos:{x:art.root.position.x,y:art.root.position.y},scale:{x:art.root.scale.x,y:art.root.scale.y},alpha:art.mesh.material.opacity,rotation:art.root.rotation.z,visible:art.root.visible}}})
   assert.equal(trail.frame,'tower_catapult_projectiles_pojectile_particle');assert(trail.render?.visible);assert(trail.alpha>0&&trail.alpha<255);assert(trail.scale.x>=.5&&trail.scale.x<=1);assert.equal(trail.scale.x,trail.scale.y);assert.equal(trail.rotation,0)
   for(const key of ['x','y']){assert.equal(trail.render.pos[key],trail.pos[key]);assert.equal(trail.render.scale[key],trail.scale[key])}assert.equal(trail.render.alpha,trail.alpha/255);assert.equal(trail.render.rotation,0)
   await page.screenshot({path:'analysis/web-catapult-native-trail.png'});await page.evaluate(()=>window.catapultFixture.game.paused=false)
  }
  await page.waitForFunction(()=>window.catapultTowerObservation?.phase==='reload')
  await page.screenshot({path:`analysis/web-catapult-lvl${level}-reload.png`})
 }
 const observation=await page.evaluate(()=>window.catapultTowerObservation);assert(observation.hp<5000);assert(observation.parts.some(p=>p.name==='ball_reload'))
 const renderCalls=await page.evaluate(()=>window.catapultRenderCalls),calls=renderCalls.map(c=>c.name);assert(renderCalls.some(c=>c.name==='ball_reload'&&c.fps===30),'balls use native default30FPS');assert(renderCalls.some(c=>c.name==='rotation_1'&&c.fps===40),'tower rotation uses native40FPS');for(const name of ['rotation_1','rotation_3','rotation_5','attack_1','attack_2','attack_3','attack_4','reload','ball_reload'])assert(calls.includes(name),name)
 await page.evaluate(()=>window.catapultFixture.site.attackDisabled=true);await page.waitForFunction(()=>window.catapultFixture.game.combat.firebookTrails.trails.every(t=>t.kind!=='catapult')&&window.catapultWorld.firebookRenderer.trailSprites.size===0)
 const queuedCraters=await page.evaluate(()=>window.craterQueues);assert(queuedCraters.length>=4);assert(queuedCraters.every(e=>!e.registered&&e.pending),'native crater birth is queued until the next flush')
 const crater=await page.evaluate(()=>{const g=window.catapultFixture.game,m=g.staticEffects.models.findLast(m=>m.name==='decal_bomb_crater_KR5'&&m.removalQueuedAt===undefined);if(!m)throw new Error('No current registered crater');window.observedCrater=m;g.paused=false;for(let i=0;i<100&&g.time-m.at<1.7;i++)g.advance(1/30);g.paused=true;return{alpha:m.sprites[0].alpha,scale:m.sprites[0].scale,pos:m.pos,age:g.time-m.at}})
 assert(crater.age>=1.7&&crater.age<2.5);assert(crater.alpha>0&&crater.alpha<255);await page.waitForTimeout(150)
 const rendered=await page.evaluate(()=>{const art=window.catapultWorld.staticEffectRenderer.sprites.get(window.observedCrater)[0];return{alpha:art.mesh.material.opacity,scale:{x:art.root.scale.x,y:art.root.scale.y},pos:{x:art.root.position.x,y:art.root.position.y}}});assert.equal(rendered.alpha,crater.alpha/255);assert.deepEqual(rendered.scale,crater.scale);assert.deepEqual(rendered.pos,crater.pos);await page.screenshot({path:'analysis/web-native-crater-fade.png'})
 const expiry=await page.evaluate(()=>{const g=window.catapultFixture.game,m=window.observedCrater;g.paused=false;for(let i=0;i<100&&m.removalQueuedAt===undefined;i++)g.advance(1/30);g.paused=true;return{time:g.time,at:m.at,alpha:m.sprites[0].alpha,queued:g.entities.registry.pendingRemovals.includes(g.entities.entity(m)),registered:!!g.entities.registry.entities.get(g.entities.entity(m).id),model:g.staticEffects.models.includes(m)}})
 assert(expiry.time-expiry.at>=2.5);assert((Math.round(expiry.time*30)-1)*(1/30)-expiry.at<2.5);assert.equal(expiry.alpha,0);assert(expiry.queued&&expiry.registered&&expiry.model)
 await page.evaluate(()=>{const g=window.catapultFixture.game;g.paused=false;g.advance(1/30);g.paused=true});await page.waitForTimeout(150)
 assert.deepEqual(await page.evaluate(()=>{const g=window.catapultFixture.game,m=window.observedCrater;return{registered:!!g.entities.registry.entities.get(g.entities.entity(m).id),model:g.staticEffects.models.includes(m),rendered:window.catapultWorld.staticEffectRenderer.sprites.has(m)}}),{registered:false,model:false,rendered:false})
 const phase=await page.evaluate(()=>window.projectileMainEvidence);assert(phase.length>0);assert(phase.every(e=>e.inOwnMain&&e.registered),'every real catapult projectile runs inside its own registered main binding');assert.equal(new Set(phase.map(e=>`${e.time}:${e.id}`)).size,phase.length,'no projectile runs twice per tick')
 const sounds=await page.evaluate(()=>window.catapultSounds);assert(sounds.includes(templates.bullet_catapult_lvl1.sound_events.insert),'native projectile fire audio');assert(sounds.includes(templates.bullet_catapult_lvl1.sound_events.hit),'native projectile impact audio');assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser catapult: normal build and four-level upgrade UI, all four direction/windup/attack/reload sequences,native40FPS tower/loader and30FPS balls, Lv4 ball reload, actual projectile hits, original100/s smoke particles/alpha/random scale/renderer positions and final cleanup, fire/impact audio triggers and original art; crater queued insertion/actual native scale+alpha/retained removal frame and next-tick renderer cleanup; no page/asset errors')
}finally{await browser.close()}
