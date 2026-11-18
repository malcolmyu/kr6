import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[],report=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3,iron:true},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),get=async name=>import(resources.find(r=>r.name.includes('/src/game/'+name+'.ts')).name),{GameSession}=await get('GameSession'),{WorldRenderer}=await get('WorldRenderer'),advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderTowers
  WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session===window.culvBGame)window.culvBWorld=this}
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.culvBGame=this
   if(!window.culvBSite){const p=this.levelData.paths.paths[2][0][99];window.culvBSite=this.towers.sites.filter(s=>!s.tower&&!s.building).sort((a,b)=>Math.hypot(a.pos.x-p.x,a.pos.y-p.y)-Math.hypot(b.pos.x-p.x,b.pos.y-p.y))[0];for(const h of this.heroes.team)h.scriptLocked=true;this.spawnCinematicEnemy('enemy_blackguard',3,p);const e=this.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.path.ni=100;Object.assign(e.path.position,p);e.frozen=true;window.culvBTarget=e}
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.culvBSite&&window.culvBWorld)
 const canvas=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(()=>window.culvBSite.pos),click=()=>page.mouse.click(canvas.x+(pos.x+512/3)/(768*16/9)*canvas.width,canvas.y+(768-pos.y)/768*canvas.height)
 await click();await confirmTowerAction(page,'矮人炮塔 · 130')
 for(let level=1;level<=4;level++){await page.waitForFunction(level=>window.culvBSite.tower===`tower_culverine_lvl${level}`&&!window.culvBSite.building,level);if(level<4){await click();await confirmTowerAction(page,/^升级 ·/)}}
 for(let rank=1;rank<=3;rank++){
  const before=await page.evaluate(()=>({spent:window.culvBSite.spent,armor:window.culvBTarget.template.health.armor}))
  if(!await page.getByRole('button',{name:'锋利弹片 · 100',exact:true}).count())await click();await confirmTowerAction(page,'锋利弹片 · 100')
  await page.waitForFunction(({rank,armor})=>{const g=window.culvBGame,w=window.culvBWorld;return window.culvBSite.powerLevels.skill_b===rank&&window.culvBTarget.template.health.armor<armor&&g.combat.nativeCulverine.rays.some(r=>r.name===`bullet_culverine_skill_b_lvl${rank}`&&!r.hidden&&!r.removed&&w.projectileSprites.has(r.id))},{rank,armor:before.armor})
  const observation=await page.evaluate(()=>{
   const g=window.culvBGame,w=window.culvBWorld,rank=window.culvBSite.powerLevels.skill_b,ray=g.combat.nativeCulverine.rays.find(r=>r.name===`bullet_culverine_skill_b_lvl${rank}`&&!r.hidden&&!r.removed),art=w.projectileSprites.get(ray.id);let key;art.root.traverse(o=>{if(o.isMesh)key=o.userData.nativePaint?.key})
   const decals=[...g.combat.nativeCulverine.decals].filter(m=>m.name==='fx_bullet_culverine_skill_b_hit').map(m=>{const a=w.culverineNativeRenderer.sprites.get(m);return {key:a?.mesh.userData.nativePaint?.key,wanted:`${g.entities.entity(m).id}:sprite:1`,alpha:a?.mesh.material.opacity,wantedAlpha:m.alpha/255}})
   return {rank,spent:window.culvBSite.spent,armor:window.culvBTarget.template.health.armor,raw:window.culvBTarget.template.health.raw_armor,key,wanted:`${g.entities.entity(ray).id}:sprite:1`,decals,rejected:g.entities.events.filter(e=>e.template===`mod_bullet_culverine_skill_b_lvl${rank}`&&e.kind==='insertRejected').length}
  })
  assert.equal(observation.spent,before.spent+100);assert.equal(observation.key,observation.wanted);assert(observation.decals.length>0);assert(observation.decals.every(d=>d.key===d.wanted&&d.alpha===d.wantedAlpha));assert(observation.rejected>0);report.push(observation);await page.screenshot({path:`analysis/web-culverine-b-rank${rank}.png`})
 }
 if(!await page.getByRole('button',{name:'锋利弹片 · 已满级',exact:true}).count())await click();assert.equal(await page.getByRole('button',{name:'锋利弹片 · 已满级',exact:true}).count(),1)
 await confirmTowerAction(page,/^出售 ·/);await page.waitForFunction(()=>!window.culvBSite.tower&&!window.culvBSite.selling&&window.culvBGame.combat.nativeCulverine.rays.length===0)
 const afterSale=await page.evaluate(()=>({armor:window.culvBTarget.template.health.armor,raw:window.culvBTarget.template.health.raw_armor,registered:window.culvBGame.entities.events.filter(e=>e.template.startsWith('mod_bullet_culverine_skill_b')&&e.kind==='insert').length}));assert(afterSale.armor<=report.at(-1).armor);assert(afterSale.raw<=report.at(-1).raw);assert.equal(afterSale.registered,0)
 await page.waitForFunction(()=>window.culvBGame.combat.nativeCulverine.decals.size===0&&window.culvBWorld.culverineNativeRenderer.sprites.size===0)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);writeFileSync('analysis/browser-culverine-b.json',JSON.stringify({note:'Controlled quiet wave/frozen armored target and ample fixture gold; actual normal build/upgrade/three B menu purchases, renderer and sale. Not ordinary campaign/video acceptance.',report,afterSale},null,2)+'\n')
 console.log('Chrome Culverine B: ordinary four-level build, all three normal100-gold purchases, actual sharp-pellet rays/decal native keys/alpha, permanent armor and rejected modifier registration, normal sale/visual cleanup; no page/asset errors.')
}finally{await browser.close()}
