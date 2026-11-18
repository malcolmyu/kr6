import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[],report=[];page.setDefaultTimeout(90000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3,iron:true},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),get=async name=>import(resources.find(r=>r.name.includes('/src/game/'+name+'.ts')).name),{GameSession}=await get('GameSession'),{WorldRenderer}=await get('WorldRenderer'),advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderTowers
  WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session===window.culvCGame)window.culvCWorld=this}
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.culvCGame=this
   if(!window.culvCSite){const p=this.levelData.paths.paths[2][0][99];window.culvCSite=this.towers.sites.filter(s=>!s.tower&&!s.building).sort((a,b)=>Math.hypot(a.pos.x-p.x,a.pos.y-p.y)-Math.hypot(b.pos.x-p.x,b.pos.y-p.y))[0];for(const h of this.heroes.team)h.scriptLocked=true;this.spawnCinematicEnemy('enemy_blackguard',3,p);const e=this.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.path.ni=100;Object.assign(e.path.position,p);e.frozen=true;window.culvCTarget=e}
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.culvCSite&&window.culvCWorld)
 const canvas=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(()=>window.culvCSite.pos),click=()=>page.mouse.click(canvas.x+(pos.x+512/3)/(768*16/9)*canvas.width,canvas.y+(768-pos.y)/768*canvas.height)
 await click();await confirmTowerAction(page,'矮人炮塔 · 130')
 for(let level=1;level<=4;level++){await page.waitForFunction(level=>window.culvCSite.tower===`tower_culverine_lvl${level}`&&!window.culvCSite.building,level);if(level<4){await click();await confirmTowerAction(page,/^升级 ·/)}}
 for(let rank=1;rank<=3;rank++){
  const price=[150,200,250][rank-1],label=`火力全开 · ${price}`,before=await page.evaluate(()=>window.culvCSite.spent)
  if(!await page.getByRole('button',{name:label,exact:true}).count())await click();await confirmTowerAction(page,label)
  await page.waitForFunction(rank=>{
   const g=window.culvCGame,w=window.culvCWorld,s=g.combat.culverineTowers.states.get(window.culvCSite.id),list=w.renderer.renderLists.get(w.scene,0).transparent
   return s?.timedAttacks[1].shots===rank*3&&s.throttleShots===rank*3&&s.phase==='throttle-rest'&&g.combat.nativeCulverine.rays.some(r=>!r.hidden&&!r.removed&&r.born>=s.phaseAt&&w.projectileSprites.has(r.id))&&[...g.throttle.models].filter(m=>{const key=`${g.entities.entity(m).id}:sprite:1`;return m.alpha>0&&list.some(v=>v.object.userData.nativePaint?.key===key&&v.object.material.opacity>0)}).length===2
  },rank)
  const view=await page.evaluate(()=>{
   const g=window.culvCGame,w=window.culvCWorld,s=g.combat.culverineTowers.states.get(window.culvCSite.id),list=w.renderer.renderLists.get(w.scene,0).transparent
   return {rank:window.culvCSite.powerLevels.skill_c,spent:window.culvCSite.spent,shots:s.throttleShots,phase:s.phase,buffs:[...g.throttle.models].map(m=>{const key=`${g.entities.entity(m).id}:sprite:1`,parts=list.filter(v=>v.object.userData.nativePaint?.key===key);return{name:m.name,key,parts:parts.length,alphas:parts.map(v=>v.object.material.opacity)}})}
  })
  assert.equal(view.rank,rank);assert.equal(view.spent,before+price);assert.equal(view.shots,rank*3);assert.equal(view.buffs.length,2);assert(view.buffs.every(b=>b.parts>0&&b.alphas.every(a=>a>=0&&a<=1)));report.push(view);await page.screenshot({path:`analysis/web-culverine-c-rank${rank}.png`})
 }
 if(!await page.getByRole('button',{name:'火力全开 · 已满级',exact:true}).count())await click();assert.equal(await page.getByRole('button',{name:'火力全开 · 已满级',exact:true}).count(),1)
 await confirmTowerAction(page,/^出售 ·/);await page.waitForFunction(()=>!window.culvCSite.tower&&!window.culvCSite.selling&&window.culvCGame.throttle.models.size===0&&window.culvCWorld.culverineThrottleRenderer.sprites.size===0&&window.culvCGame.combat.nativeCulverine.rays.length===0)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);writeFileSync('analysis/browser-culverine-c.json',JSON.stringify({note:'Controlled quiet wave/frozen high-HP target and ample fixture gold; actual normal build/upgrade/three C menu purchases and sale. Not ordinary campaign/video acceptance.',report},null,2)+'\n')
 console.log('Chrome Culverine C: ordinary four-level build and150/200/250-gold purchases, actual3/6/9-shot bursts and front/back EXO layers in the submitted renderer, normal sale and complete buff/ray cleanup; no page/asset errors.')
}finally{await browser.close()}
