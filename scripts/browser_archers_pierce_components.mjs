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
  WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session?.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))window.markWorld=this}
  GameSession.prototype.advance=function(dt){advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.markSession=this;for(const h of this.heroes.team)h.scriptLocked=true
   if(!window.markSite){window.markSite=this.towers.sites.find(s=>!s.tower&&!s.building&&s.pos.x>250&&s.pos.x<850&&s.pos.y>180&&s.pos.y<500);window.markCasts=[];const cast=this.combat.archerMarkCaster.onEagle;this.combat.archerMarkCaster.onEagle=(...args)=>{window.markCasts.push({time:this.time});cast(...args)}}
   for(const site of this.towers.sites)site.attackDisabled=site!==window.markSite
   if(window.capturePierce&&this.combat.archerPierceRays.rays.some(r=>r.born!==undefined&&!r.hidden)&&this.archerPierceStun.stuns.length)this.paused=true
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.markSite&&window.markWorld)
 async function clickSite(){const box=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(()=>window.markSite.pos);await page.mouse.click(box.x+(pos.x+512/3)/(768*16/9)*box.width,box.y+(768-pos.y)/768*box.height)}
 await clickSite();await confirmTowerAction(page,'弓箭塔 · 70');await page.waitForFunction(()=>window.markSite.tower)
 for(let i=0;i<3;i++){await clickSite();await confirmTowerAction(page,/^升级 ·/)}
 await page.evaluate(async()=>{const resources=performance.getEntriesByType('resource'),{PathFollower}=await import(resources.find(r=>r.name.includes('/src/game/PathFollower.ts')).name),g=window.markSession,pos={x:window.markSite.pos.x+100,y:window.markSite.pos.y+20};g.spawnCinematicEnemy('enemy_bandit',1,pos);const e=g.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.frozen=true;e.skillLocked=true;e.template.unit.mod_offset={x:7,y:13};window.markEnemy=e})
 await page.evaluate(()=>{window.markSite.powerLevels={skill_a:1};window.capturePierce=true})
 await page.waitForFunction(()=>window.markSession.paused&&window.markWorld.projectileSprites.size>0)
 await page.waitForTimeout(100)
 const state=await page.evaluate(()=>{const g=window.markSession,w=window.markWorld,ray=g.combat.archerPierceRays.rays.find(r=>!r.hidden),entity=g.entities.entity(ray),art=w.projectileSprites.get(ray.id),meshes=[];art.root.traverse(o=>{if(o.isMesh)meshes.push({key:o.userData.nativePaint?.key,uv:[...o.geometry.attributes.uv.array]})});return{rayId:entity.id,registered:!!g.entities.registry.entities.get(entity.id),rays:g.combat.archerPierceRays.rays.length,stunCount:window.markEnemy.template.unit.stun_count,stuns:g.archerPierceStun.stuns.length,art:{visible:art.root.visible,pos:{x:art.root.position.x,y:art.root.position.y},rotation:art.root.rotation.z,scale:{x:art.root.scale.x,y:art.root.scale.y}},ray:{pos:ray.pos,rotation:ray.rotation,scale:ray.scale},meshes}})
 assert(state.registered);assert.equal(state.rays,2);assert.equal(state.stunCount,1);assert.equal(state.stuns,1);assert(state.art.visible);assert.deepEqual(state.art.pos,state.ray.pos);assert.equal(state.art.rotation,state.ray.rotation);assert.deepEqual(state.art.scale,state.ray.scale);assert(state.meshes.every(m=>m.key===`${state.rayId}:sprite:1`));assert(state.meshes.every(m=>m.uv.every(Number.isFinite)))
 await page.screenshot({path:'analysis/web-archers-pierce-registered-ray.png'})
 await page.evaluate(()=>{const g=window.markSession;window.capturePierce=false;g.paused=false;g.sellTower(window.markSite.id);for(let i=0;i<240;i++){g.paused=false;g.advance(1/30)}g.paused=true})
 await page.waitForFunction(()=>window.markWorld.projectileSprites.size===0)
 assert.equal(await page.evaluate(()=>window.markSession.combat.archerPierceRays.rays.length),0);assert.equal(await page.evaluate(()=>window.markSession.archerPierceStun.stuns.length),0);assert.equal(await page.evaluate(()=>window.markEnemy.template.unit.stun_count),0)
 assert([...audio].some(url=>sounds.TowerArcherGarrisonTendonPierceCast.files.some(file=>url.endsWith(file))));assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Chrome A integration: real build/upgrade UI, injected A rank1 and durable target, two registered visible animated ray models, transform/native painter keys, duplicate stun refresh, cast audio and normal sale cleanup. A rank is injected in this component test; normal purchase UI is covered separately. No ordinary-battle/video claim.')
}catch(e){if(page)await page.screenshot({path:'analysis/archers-pierce-browser-failure.png'});throw e}finally{await browser.close()}
