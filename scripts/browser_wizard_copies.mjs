import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const sounds=JSON.parse(readFileSync('public/data/audio.json')).sounds,browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});let page
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(45000);const errors=[],missing=[],audio=new Set()
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());if(r.ok()&&r.url().includes('/audio/'))audio.add(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),get=async name=>import(resources.find(r=>r.name.includes('/src/game/'+name+'.ts')).name),{GameSession}=await get('GameSession'),{WorldRenderer}=await get('WorldRenderer'),advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderTowers
  WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this===window.copyWorld||this.session?.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))window.copyWorld=this}
  GameSession.prototype.advance=function(dt){if(window.holdCopy)return;advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.copySession=this;for(const h of this.heroes.team)h.scriptLocked=true
   if(!window.copySite){window.copySite=this.towers.sites.find(s=>!s.tower&&!s.building&&s.pos.x>250&&s.pos.x<850&&s.pos.y>180&&s.pos.y<500);window.copyCasts=[];window.copyLands=[];const cast=this.combat.wizardTowers.onCopies,land=this.combat.onCopiesLanded;this.combat.wizardTowers.onCopies=(...args)=>{window.copyCasts.push({time:this.time,level:args[5]});cast(...args)};this.combat.onCopiesLanded=(...args)=>{window.copyLands.push({time:this.time,level:args[1]});land(...args)}}
   for(const site of this.towers.sites)site.attackDisabled=site!==window.copySite
   if(!window.soldCopy&&this.combat.projectiles.some(p=>p.name==='bullet_skill_c_wizard_1'&&p.level===3&&!p.done&&this.time-p.born>=.1)){window.holdCopy=true;window.soldCopy=true}
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.copySite&&window.copyWorld)
 async function clickSite(){const box=await page.locator('.viewport canvas').boundingBox(),p=await page.evaluate(()=>window.copySite.pos);await page.mouse.click(box.x+(p.x+512/3)/(768*16/9)*box.width,box.y+(768-p.y)/768*box.height)}
 await clickSite();await confirmTowerAction(page,'法师塔 · 100');await page.waitForFunction(()=>window.copySite.tower);for(let i=0;i<3;i++){await clickSite();await confirmTowerAction(page,/^升级 ·/)}
 await page.evaluate(async()=>{const resources=performance.getEntriesByType('resource'),{PathFollower}=await import(resources.find(r=>r.name.includes('/src/game/PathFollower.ts')).name),g=window.copySession,pos={x:window.copySite.pos.x+100,y:window.copySite.pos.y+20};g.spawnCinematicEnemy('enemy_bandit',1,pos);const e=g.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.frozen=true;e.skillLocked=true;window.copyEnemy=e})
 for(let level=1;level<=3;level++){
  if(!await page.getByRole('button',{name:'备份抄本 · 160',exact:true}).count())await clickSite();const gold=await page.evaluate(()=>window.copySession.gold);await confirmTowerAction(page,'备份抄本 · 160');assert.equal(await page.evaluate(()=>window.copySession.gold),gold-160);assert.equal(await page.evaluate(()=>window.copySite.powerLevels.skill_c),level)
  if(level===3)assert.equal(await page.getByRole('button',{name:'备份抄本 · 已满级',exact:true}).count(),1)
  await page.waitForFunction(l=>window.copyCasts.some(c=>c.level===l),level)
  await page.waitForFunction(l=>window.copySession.combat.projectiles.some(p=>p.name==='bullet_skill_c_wizard_1'&&p.level===l&&!p.done),level)
  await page.screenshot({path:`analysis/web-wizard-copies-flight-${level}.png`})
  if(level===3){await page.waitForFunction(()=>window.holdCopy);if(!await page.getByRole('button',{name:/^出售 ·/}).count())await clickSite();await confirmTowerAction(page,/^出售 ·/);assert(await page.evaluate(()=>window.copySite.selling));await page.evaluate(()=>window.holdCopy=false);await page.waitForFunction(()=>!window.copySite.tower)}
  await page.waitForFunction(l=>window.copyLands.some(c=>c.level===l),level)
  await page.waitForFunction(l=>window.copySession.wizardCopies.auras.some(a=>a.level===l&&a.inserted&&window.copyWorld.copiesRenderer.sprites.has(a)),level)
  const aura=await page.evaluate(l=>{const g=window.copySession,w=window.copyWorld,m=g.wizardCopies.auras.find(a=>a.level===l&&a.inserted),art=w.copiesRenderer.sprites.get(m),e=g.entities.entity(m);return{id:e.id,registered:!!g.entities.registry.entities.get(e.id),key:art.mesh.userData.nativePaint.key,pos:m.pos,actual:{x:art.root.position.x,y:art.root.position.y},alpha:m.alpha,opacity:art.mesh.material.opacity}},level);assert(aura.registered);assert.equal(aura.key,`${aura.id}:sprite:1`);assert.deepEqual(aura.actual,aura.pos);assert.equal(aura.opacity,aura.alpha/255)
  await page.screenshot({path:`analysis/web-wizard-copies-ground-${level}.png`})
  await page.waitForFunction(l=>window.copySession.wizardCopies.auras.some(a=>a.level===l&&a.phase==='windup'),level);await page.screenshot({path:`analysis/web-wizard-copies-shoot-${level}.png`})
  await page.waitForFunction(()=>window.copySession.combat.projectiles.some(p=>p.name==='bolt_tower_wizard_lvl4'&&p.damageMin!==undefined))
  assert(await page.evaluate(()=>window.copyEnemy.hp<10000));await page.waitForFunction(l=>!window.copySession.wizardCopies.auras.some(a=>a.level===l),level)
 }
 await page.waitForFunction(()=>window.copySession.combat.firebookTrails.trails.length===0&&window.copySession.combat.projectiles.length===0);assert.equal(await page.evaluate(()=>window.copyWorld.copiesRenderer.sprites.size),0)
 for(const name of ['TowerScholarMageSpareCopiesCast','TowerScholarMageSpareCopiesBolts','TowerScholarMageSpareCopiesImpact'])assert([...audio].some(url=>sounds[name].files.some(file=>url.endsWith(file))),name);assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Chrome wizard copies: three actual160-gold purchases/cap, thrown book → real bounce → paper trail → landed book and registered render → shard damage → fade/cleanup; sell during level3 flight retains the full autonomous chain and original cast sound. Quiet waves/durable controlled target, not ordinary battle/video acceptance.')
}catch(e){if(page){await page.screenshot({path:'analysis/wizard-copies-browser-failure.png'});console.error(await page.evaluate(()=>({time:window.copySession?.time,casts:window.copyCasts,lands:window.copyLands,held:window.holdCopy,site:window.copySite,aura:window.copySession?.wizardCopies.auras,errors:document.querySelector('[role=alert]')?.textContent})))}throw e}finally{await browser.close()}
