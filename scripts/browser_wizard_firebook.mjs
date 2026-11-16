import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const sounds=JSON.parse(readFileSync('public/data/audio.json')).sounds,browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
let page
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],missing=[],audio=new Set();page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());if(r.ok()&&r.url().includes('/audio/'))audio.add(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.25;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=p=>performance.getEntriesByType('resource').find(r=>r.name.includes(p)).name,{GameSession}=await import(resource('/src/game/GameSession.ts')),{WorldRenderer}=await import(resource('/src/game/WorldRenderer.ts')),advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderTowers
  const {AtlasSprite}=await import(resource('/src/game/SpriteAtlas.ts')),setFrame=AtlasSprite.prototype.setFrame;AtlasSprite.prototype.setFrame=function(name,...args){this.observedTrailFrame=name;return setFrame.call(this,name,...args)}
  WorldRenderer.prototype.renderTowers=function(){render.call(this);window.fireWorld=this;if(window.fireSite){const s=this.session.combat.wizardTowers.states.get(window.fireSite.id);if(s)for(const p of s.parts){window.fireAnimations??=[];if(!window.fireAnimations.includes(p.name))window.fireAnimations.push(p.name)}}}
  GameSession.prototype.advance=function(dt){advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.fireSession=this;this.heroes.team.forEach(h=>h.scriptLocked=true);if(!window.fireSite){window.fireSite=this.towers.sites.find(s=>!s.tower&&!s.building&&s.pos.x>250&&s.pos.x<850&&s.pos.y>180&&s.pos.y<500);window.fireCasts=[];window.fireDamage=[];const fire=this.combat.wizardTowers.onFirebook;this.combat.wizardTowers.onFirebook=(...args)=>{window.fireCasts.push({time:this.time,level:args[5],min:args[6],max:args[7]});fire(...args)};const damage=this.combat.firebook.onDamage;this.combat.firebook.onDamage=(e,d,time)=>{window.fireDamage.push({time,value:d.value});damage(e,d,time)}}for(const s of this.towers.sites)s.attackDisabled=s!==window.fireSite}
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.fireSite)
 async function clickSite(){const box=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(()=>window.fireSite.pos);await page.mouse.click(box.x+(pos.x+512/3)/(768*16/9)*box.width,box.y+(768-pos.y)/768*box.height)}
 await clickSite();await confirmTowerAction(page,'法师塔 · 100');await page.waitForFunction(()=>window.fireSite.tower);for(let i=0;i<3;i++){await clickSite();await confirmTowerAction(page,/^升级 ·/)}
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/PathFollower.ts')).name,{PathFollower}=await import(url),s=window.fireSession,pos={x:window.fireSite.pos.x+100,y:window.fireSite.pos.y+20};s.spawnCinematicEnemy('enemy_bandit',1,pos);const e=s.enemies.at(-1);e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.frozen=true;e.hp=10000;e.template.health.hp_max=10000;window.fireEnemy=e})
 for(let level=1;level<=3;level++){
  if(!await page.getByRole('button',{name:'火炎法书 · 120',exact:true}).count())await clickSite();const gold=await page.evaluate(()=>window.fireSession.gold);await confirmTowerAction(page,'火炎法书 · 120');assert.equal(await page.evaluate(()=>window.fireSession.gold),gold-120);assert.equal(await page.evaluate(()=>window.fireSite.powerLevels.skill_a),level)
  if(level===3)assert.equal(await page.getByRole('button',{name:'火炎法书 · 已满级',exact:true}).count(),1)
  await page.waitForFunction(l=>window.fireCasts.some(c=>c.level===l),level)
  await page.waitForFunction(()=>window.fireSession.combat.projectiles.some(p=>p.name==='bullet_firebook_wizard'))
  assert.equal(await page.evaluate(()=>window.fireSession.combat.projectiles.find(p=>p.name==='bullet_firebook_wizard').damageFactor),1)
  await page.waitForFunction(()=>window.fireSession.combat.firebookTrails.trails.some(t=>t.kind==='firebook'&&t.particles.length>=5)&&window.fireWorld.firebookRenderer.trailSprites.size>=5)
  const rendered=await page.evaluate(()=>{const s=window.fireSession;s.paused=true;const rows=[];for(const t of s.combat.firebookTrails.trails)for(const p of t.particles){const art=window.fireWorld.firebookRenderer.trailSprites.get(p.id);if(art)rows.push({frame:p.frame,actualFrame:art.observedTrailFrame,position:p.pos,actualPosition:{x:art.root.position.x,y:art.root.position.y},rotation:p.rotation,actualRotation:art.root.rotation.z,opacity:art.mesh.material.opacity,visible:art.root.visible})}return rows})
  assert(rendered.length>=5);for(const p of rendered){assert.equal(p.actualFrame,p.frame);assert.deepEqual(p.actualPosition,p.position);assert.equal(p.actualRotation,p.rotation);assert.equal(p.opacity,1);assert.equal(p.visible,true)}
  await page.screenshot({path:`analysis/web-wizard-firebook-trail-level${level}.png`});await page.evaluate(()=>window.fireSession.paused=false)
  if(level===3){assert(await page.evaluate(()=>window.fireSession.combat.projectiles.some(p=>p.name==='bullet_firebook_wizard')));if(!await page.getByRole('button',{name:/^出售 ·/}).count())await clickSite();await confirmTowerAction(page,/^出售 ·/);await page.waitForFunction(()=>window.fireSite.tower===undefined&&!window.fireSite.selling);assert.equal(await page.evaluate(()=>window.fireSite.tower),undefined);const dust=await page.evaluate(()=>{const g=window.fireSession,m=g.nativeEffects.find(e=>e.name==='fx_tower_sell_dust');return m&&{pos:m.pos,at:m.at,id:g.entities.entity(m)?.id,site:window.fireSite.pos}});assert(dust?.id>0,'Selling queues a real original timed dust entity');assert.deepEqual(dust.pos,{x:dust.site.x,y:dust.site.y+35})}
  await page.waitForFunction(l=>window.fireSession.combat.firebook.burns.some(b=>b.level===l),level)
  await page.waitForFunction(()=>window.fireWorld.firebookRenderer.sprites.size>0)
  const nativeBurns=await page.evaluate(()=>{const g=window.fireSession,w=window.fireWorld;return g.combat.firebook.burns.map(b=>{const e=g.entities.entity(b),art=w.firebookRenderer.sprites.get(b.id),previous=g.entities.events.filter(e=>e.kind==='create'&&e.id<g.entities.entity(b).id).at(-1);return {native:g.combat.firebook.native,id:e?.id,registered:!!e&&!!g.entities.registry.entities.get(e.id),aliases:b.pos===b.enemy.path.position,paint:art?.mesh.userData.nativePaint,z:b.enemy.template.render.sprites[0].z??3000,x:b.pos.x,y:b.pos.y,previous}})});assert(nativeBurns.length>0);for(const b of nativeBurns){assert(b.native&&b.registered&&b.aliases);assert.equal(b.paint.key,`${b.id}:sprite:1`);assert.equal(b.paint.draw,200000+b.id);assert.equal(b.paint.z,b.z);assert.equal(b.paint.x,b.x);assert.equal(b.paint.y,b.y);assert.equal(b.previous.template,'damage','Original firebook creates hit damage before its modifier');assert.equal(b.previous.id,b.id-1)}
  if(level===2){
   await page.evaluate(()=>{window.fireSession.paused=true;window.fireEnemy.teleportHidden=true})
   await page.waitForFunction(()=>window.fireWorld.firebookRenderer.sprites.size>0&&[...window.fireWorld.firebookRenderer.sprites.values()].every(a=>!a.root.visible))
   assert(await page.evaluate(()=>window.fireSession.combat.firebook.burns.every(b=>!!window.fireSession.entities.registry.entities.get(window.fireSession.entities.entity(b).id))))
   await page.evaluate(()=>window.fireEnemy.teleportHidden=false)
   await page.waitForFunction(()=>[...window.fireWorld.firebookRenderer.sprites.values()].every(a=>a.root.visible))
   await page.evaluate(()=>window.fireSession.paused=false)
  }
  assert(await page.evaluate(v=>window.fireDamage.some(d=>d.value===v),level+1));assert(await page.evaluate(()=>window.fireEnemy.hp<10000))
  await page.screenshot({path:`analysis/web-wizard-firebook-level${level}.png`})
 }
 await page.waitForFunction(()=>window.fireSession.combat.firebookTrails.trails.length===0);assert.equal(await page.evaluate(()=>window.fireWorld.firebookRenderer.trailSprites.size),0)
 await page.waitForFunction(()=>window.fireSession.combat.firebook.burns.length===0);assert.equal(await page.evaluate(()=>window.fireWorld.firebookRenderer.sprites.size),0)
 assert(await page.evaluate(()=>window.fireAnimations.some(a=>a.startsWith('firebook'))))
 for(const name of ['TowerScholarMageSkillATaunt','TowerScholarMageTomeOfFlamesCast','TowerScholarMageTomeOfFlamesImpact'])assert([...audio].some(url=>sounds[name].files.some(file=>url.endsWith(file))),name+' original audio requested')
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: normal wizard4/A three120-gold purchases, caster firebook animation, real60FPS atlas trail frames/positions/rotation/opacity and cleanup, flight/impact and native fire sprites/DPS all three levels, original taunt/cast/impact sound requests, no source-factor inheritance, sold-source in-flight hit/burn persistence and expiry; frozen controlled enemy, not video acceptance')
}catch(e){if(page){await page.screenshot({path:'analysis/wizard-firebook-browser-failure.png'});console.error(await page.evaluate(()=>({time:window.fireSession?.time,casts:window.fireCasts,damage:window.fireDamage,site:window.fireSite,animations:window.fireAnimations,error:document.querySelector('[role=alert]')?.textContent})))}throw e}finally{await browser.close()}
