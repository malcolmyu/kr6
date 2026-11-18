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
  WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session===window.culvAGame)window.culvAWorld=this}
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.culvAGame=this
   if(!window.culvASite){const p=this.levelData.paths.paths[2][0][99];window.culvASite=this.towers.sites.filter(s=>!s.tower&&!s.building).sort((a,b)=>Math.hypot(a.pos.x-p.x,a.pos.y-p.y)-Math.hypot(b.pos.x-p.x,b.pos.y-p.y))[0];for(const h of this.heroes.team)h.scriptLocked=true;this.spawnCinematicEnemy('enemy_blackguard',3,p);const e=this.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.template.health.magic_armor=.4;e.path.ni=100;Object.assign(e.path.position,p);e.frozen=true;window.culvATarget=e}
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.culvASite&&window.culvAWorld)
 const canvas=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(()=>window.culvASite.pos),click=()=>page.mouse.click(canvas.x+(pos.x+512/3)/(768*16/9)*canvas.width,canvas.y+(768-pos.y)/768*canvas.height)
 await click();await confirmTowerAction(page,'矮人炮塔 · 130')
 for(let level=1;level<=4;level++){await page.waitForFunction(level=>window.culvASite.tower===`tower_culverine_lvl${level}`&&!window.culvASite.building,level);if(level<4){await click();await confirmTowerAction(page,/^升级 ·/)}}
 for(let rank=1;rank<=3;rank++){
  const before=await page.evaluate(()=>window.culvASite.spent)
  if(!await page.getByRole('button',{name:'硫磺爆裂 · 125',exact:true}).count())await click();await confirmTowerAction(page,'硫磺爆裂 · 125')
  await page.waitForFunction(rank=>{const g=window.culvAGame,w=window.culvAWorld;return g.combat.projectiles.some(p=>p.name===`bullet_culverine_skill_a_lvl${rank}`&&!p.done&&!p.bombMotion.hidden&&w.projectileSprites.has(p.id))},rank)
  const flight=await page.evaluate(rank=>{const g=window.culvAGame,w=window.culvAWorld,p=g.combat.projectiles.find(p=>p.name===`bullet_culverine_skill_a_lvl${rank}`&&!p.done&&!p.bombMotion.hidden),art=w.projectileSprites.get(p.id);let key;art.root.traverse(o=>{if(o.isMesh)key=o.userData.nativePaint?.key});return {key,wanted:`${g.entities.entity(p).id}:sprite:1`,spent:window.culvASite.spent}},rank);assert.equal(flight.key,flight.wanted);assert.equal(flight.spent,before+125)
  await page.screenshot({path:`analysis/web-culverine-a-rank${rank}-flight.png`})
  await page.waitForFunction(rank=>{const g=window.culvAGame,w=window.culvAWorld;return window.culvATarget.template.health.magic_armor===0&&[...g.sulfur.decals].some(m=>m.name===`decal_bullet_culverine_skill_a_lvl${rank}`&&w.culverineNativeRenderer.sprites.has(m))},rank)
  const impact=await page.evaluate(rank=>{const g=window.culvAGame,w=window.culvAWorld,m=[...g.sulfur.decals].find(m=>m.name===`decal_bullet_culverine_skill_a_lvl${rank}`),a=w.culverineNativeRenderer.sprites.get(m);return {key:a.mesh.userData.nativePaint?.key,wanted:`${g.entities.entity(m).id}:sprite:1`,alpha:a.mesh.material.opacity,wantedAlpha:m.alpha/255,magicArmor:window.culvATarget.template.health.magic_armor,modifiers:[...g.sulfur.modifiers].filter(m=>m.name===`mod_bullet_culverine_skill_a_lvl${rank}`).length}},rank)
  assert.equal(impact.key,impact.wanted);assert.equal(impact.alpha,impact.wantedAlpha);assert.equal(impact.magicArmor,0);assert(impact.modifiers>0);report.push({rank,flight,impact});await page.screenshot({path:`analysis/web-culverine-a-rank${rank}-impact.png`})
 }
 if(!await page.getByRole('button',{name:'硫磺爆裂 · 已满级',exact:true}).count())await click();assert.equal(await page.getByRole('button',{name:'硫磺爆裂 · 已满级',exact:true}).count(),1)
 await confirmTowerAction(page,/^出售 ·/);await page.waitForFunction(()=>!window.culvASite.tower&&!window.culvASite.selling)
 const persistent=await page.evaluate(()=>({areas:window.culvAGame.sulfur.areas.size,magicArmor:window.culvATarget.template.health.magic_armor}));assert(persistent.areas>0);assert.equal(persistent.magicArmor,0)
 await page.waitForFunction(()=>window.culvAGame.sulfur.areas.size===0&&window.culvAGame.sulfur.modifiers.size===0&&window.culvAGame.sulfur.decals.size===0&&window.culvAWorld.culverineNativeRenderer.sprites.size===0)
 const afterSale=await page.evaluate(()=>window.culvATarget.template.health.magic_armor);assert.equal(afterSale,.4)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);writeFileSync('analysis/browser-culverine-a.json',JSON.stringify({note:'Controlled quiet wave/frozen target with magic armor and ample fixture gold; actual normal build/upgrade/three A menu purchases and sale. Not ordinary campaign/video acceptance.',report,persistent,afterSale},null,2)+'\n')
 console.log('Chrome Culverine A: ordinary four-level build and three125-gold purchases, actual thrown bombs/smoke native keys/alpha and temporary zero magic armor, sale preserves area until expiry, armor restored and all smoke cleaned; no page/asset errors.')
}finally{await browser.close()}
