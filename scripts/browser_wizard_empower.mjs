import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const sounds=JSON.parse(readFileSync('public/data/audio.json')).sounds,browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[],audio=new Set();page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());if(r.ok()&&r.url().includes('/audio/'))audio.add(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.25;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){const hp=window.empowerEnemy?.hp;advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.empowerSession=this;this.heroes.team.forEach(h=>h.scriptLocked=true)
   if(!window.empowerSource){const empty=this.towers.sites.filter(s=>!s.tower&&!s.building&&s.pos.x>200&&s.pos.x<900&&s.pos.y>150&&s.pos.y<600);let pair;for(const a of empty)for(const b of empty)if(a!==b){const dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=Math.hypot(dx,dy/.7),enemy={x:b.pos.x+dx*100/d,y:b.pos.y+dy*100/d};if(d>115&&d<175&&enemy.x>50&&enemy.x<1000&&enemy.y>100&&enemy.y<650&&!pair)pair={a,b,enemy}}if(!pair)throw new Error('native fixture needs nearby holders');window.empowerSource=pair.a;window.empowerTarget=pair.b;window.empowerEnemyPos=pair.enemy;window.empowerHits=[]}
   for(const site of this.towers.sites)site.attackDisabled=site!==window.empowerSource&&site!==window.empowerTarget
   if(hp!==undefined&&hp>window.empowerEnemy.hp)window.empowerHits.push({time:this.time,value:hp-window.empowerEnemy.hp,factor:window.empowerTarget.damageFactor??1})
  }
 })
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/WorldRenderer.ts')).name,{WorldRenderer}=await import(url),render=WorldRenderer.prototype.renderTowers;WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session?.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))window.empowerWorld=this}})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.empowerSource)
 async function clickSite(which){const box=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(key=>window[key].pos,which);await page.mouse.click(box.x+(pos.x+512/3)/(768*16/9)*box.width,box.y+(768-pos.y)/768*box.height)}
 await clickSite('empowerSource');await confirmTowerAction(page,'法师塔 · 100');await page.waitForFunction(()=>window.empowerSource.tower)
 for(let i=0;i<3;i++){await clickSite('empowerSource');await confirmTowerAction(page,/^升级 ·/)}
 await clickSite('empowerTarget');await confirmTowerAction(page,'弓箭塔 · 70');await page.waitForFunction(()=>window.empowerTarget.tower)
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/PathFollower.ts')).name,{PathFollower}=await import(url),s=window.empowerSession,pos=window.empowerEnemyPos;s.spawnCinematicEnemy('enemy_bandit',1,pos);const e=s.enemies.at(-1);e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.frozen=true;e.hp=5000;e.template.health.hp_max=5000;e.template.health.armor=0;window.empowerEnemy=e})
 await page.waitForFunction(()=>window.empowerHits.length>=2);const baseline=await page.evaluate(()=>window.empowerHits.at(-1).value);assert(baseline>0)
 await page.evaluate(()=>Object.assign(window.empowerEnemy.path.position,{x:2000,y:2000}))
 await clickSite('empowerSource');const first=page.getByRole('button',{name:'知识之卷 · 150',exact:true});await first.click();await page.waitForFunction(()=>window.empowerSession.wizardEmpower.visuals.some(v=>v.kind==='preview'&&v.inserted));await page.waitForTimeout(200);await page.screenshot({path:'analysis/web-wizard-empower-preview.png'});await first.click();await page.locator('.power-buy-fx').waitFor()
 await confirmTowerAction(page,'知识之卷 · 180');await confirmTowerAction(page,'知识之卷 · 220');assert.equal(await page.locator('.power-rank[src$="_enabled.png"]').count(),3);assert.equal(await page.getByRole('button',{name:'知识之卷 · 已满级',exact:true}).count(),1)
 await page.evaluate(()=>Object.assign(window.empowerEnemy.path.position,window.empowerEnemyPos))
 await page.waitForFunction(()=>window.empowerTarget.damageFactor===2);await page.waitForFunction(base=>window.empowerHits.some(h=>h.factor===2&&h.value===base*2),baseline)
 assert.equal(await page.evaluate(()=>window.empowerSource.damageFactor??1),1,'wizard does not empower itself');assert(await page.evaluate(()=>window.empowerSession.wizardEmpower.visuals.some(v=>v.kind==='fx'&&v.started!==undefined)))
 const native=await page.evaluate(()=>{const g=window.empowerSession,w=window.empowerWorld,items=[];for(const m of g.wizardEmpower.runtime.models){if(m.kind==='buff'||!m.inserted)continue;const e=g.entities.entity(m),art=w.wizardEmpowerRenderer.sprites.get(e.id);if(!art)throw Error('missing native empowerment renderer');const keys=[];art.root.traverse(o=>{if(o.isMesh)keys.push(o.userData.nativePaint?.key)});items.push({kind:m.kind,id:e.id,keys})}return items});assert(native.some(m=>m.kind==='fx'));assert(native.some(m=>m.kind==='decal'));assert(native.every(m=>m.keys.length>0&&m.keys.every(key=>key===`${m.id}:sprite:1`)))
 await page.screenshot({path:'analysis/web-wizard-empower-active.png'})
 await page.getByRole('button',{name:'取消',exact:true}).click();await clickSite('empowerTarget');await confirmTowerAction(page,/^升级 ·/);await page.waitForFunction(()=>window.empowerTarget.tower==='tower_archers_lvl2'&&window.empowerSession.entities.entity(window.empowerTarget)?.template==='tower_archers_lvl2'&&window.empowerTarget.damageFactor===2)
 await clickSite('empowerSource');await confirmTowerAction(page,/^出售 ·/);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>window.empowerTarget.damageFactor),2,'applied wizard buff survives source sale');await page.screenshot({path:'analysis/web-wizard-empower-source-sold.png'})
 await page.waitForFunction(()=>window.empowerTarget.damageFactor===1&&window.empowerSession.wizardEmpower.buffs.size===0);await page.waitForFunction(()=>window.empowerSession.wizardEmpower.visuals.length===0);await page.screenshot({path:'analysis/web-wizard-empower-expired.png'})
 for(const name of ['TowerScholarMageSkillBTaunt','TowerScholarMageScrollOfKnowledgeCast'])assert([...audio].some(url=>sounds[name].files.some(file=>url.endsWith(file))),name+' original audio requested')
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: normal wizard Lv4 build and three B purchases, native preview/scroll/caster/FX/decal art and audio, actual doubled archer damage, no self-buff, target-upgrade retention, source-sale persistence and timed/faded expiry; isolated frozen target, not natural/video acceptance')
}finally{await browser.close()}
