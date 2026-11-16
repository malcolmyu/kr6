import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),advance=GameSession.prototype.advance;GameSession.prototype.advance=function(dt){advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.rangeSession=this;this.heroes.team.forEach(h=>h.scriptLocked=true);if(!window.rangeSource){const empty=this.towers.sites.filter(s=>!s.tower&&!s.building&&s.pos.x>100&&s.pos.x<850&&s.pos.y>160&&s.pos.y<600);let pair;for(const a of empty)for(const b of empty)if(a!==b){const distance=Math.hypot(a.pos.x-b.pos.x,(a.pos.y+12-b.pos.y)/.7);if(distance<210&&distance>100&&(!pair||distance<pair.distance))pair={a,b,distance}}if(!pair)throw new Error('native fixture needs two nearby holders');window.rangeSource=pair.a;window.rangeTarget=pair.b;window.rangeShots=new Set()}
 for(const site of this.towers.sites)site.attackDisabled=site!==window.rangeTarget
 for(const p of this.combat.projectiles)if(p.name.startsWith('bolt_tower_wizard')&&p.target.id===window.rangeEnemy?.id)window.rangeShots.add(p.id)
 }})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.rangeSource)
 async function clickSite(which){const box=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(key=>window[key].pos,which);await page.mouse.click(box.x+(pos.x+512/3)/(768*16/9)*box.width,box.y+(768-pos.y)/768*box.height)}
 await clickSite('rangeSource');await confirmTowerAction(page,'弓箭塔 · 70');await page.waitForFunction(()=>window.rangeSource.tower)
 for(let i=0;i<3;i++){await clickSite('rangeSource');await confirmTowerAction(page,/^升级 ·/)}
 await clickSite('rangeTarget');await confirmTowerAction(page,'法师塔 · 100');await page.waitForFunction(()=>window.rangeTarget.tower)
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/PathFollower.ts')).name,{PathFollower}=await import(url),s=window.rangeSession,t=window.rangeTarget,pos={x:t.pos.x+175,y:t.pos.y+12};s.spawnCinematicEnemy('enemy_bandit',1,pos);const e=s.enemies.at(-1);e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.frozen=true;e.template.motion.max_speed=0;e.hp=5000;e.template.health.hp_max=5000;window.rangeEnemy=e})
 await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>window.rangeShots.size),0,'unbuffed wizard cannot reach175')
 await clickSite('rangeSource');const skill=page.getByRole('button',{name:'苍穹之眼 · 120',exact:true});await skill.click();await page.waitForFunction(()=>window.rangeSession.archerRange.previews.some(p=>p.at!==undefined));await page.waitForTimeout(600);await page.screenshot({path:'analysis/web-archers-range-preview.png'});await skill.click();await page.locator('.power-buy-fx').waitFor();await page.screenshot({path:'analysis/web-archers-range-buy.png'})
 await page.waitForFunction(()=>Math.abs(window.rangeTarget.rangeFactor-1.15)<1e-8);await page.waitForFunction(()=>window.rangeShots.size>0);await page.waitForFunction(()=>window.rangeEnemy.hp<5000)
 for(let level=2;level<=3;level++){await confirmTowerAction(page,'苍穹之眼 · 120');await page.waitForFunction(factor=>Math.abs(window.rangeTarget.rangeFactor-factor)<1e-8,[1,1.15,1.25,1.35][level]);await page.screenshot({path:`analysis/web-archers-range-level${level}.png`})}
 assert.equal(await page.getByRole('button',{name:'苍穹之眼 · 已满级',exact:true}).count(),1);assert.equal(await page.locator('.power-rank[src$="_enabled.png"]').count(),3)
 await page.getByRole('button',{name:'取消',exact:true}).click();await clickSite('rangeTarget');await confirmTowerAction(page,/^升级 ·/);assert(Math.abs(await page.evaluate(()=>window.rangeTarget.rangeFactor)-1.35)<1e-8)
 await clickSite('rangeSource');await confirmTowerAction(page,/^出售 ·/);await page.waitForFunction(()=>Math.abs(window.rangeTarget.rangeFactor-1)<1e-8&&window.rangeSession.archerRange.buffs.size===0);await page.waitForTimeout(2200);const shots=await page.evaluate(()=>window.rangeShots.size);await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.rangeShots.size),shots,'sold aura no longer extends wizard range')
 await page.screenshot({path:'analysis/web-archers-range-source-sold.png'});assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: normal build/upgrade and three native skill purchases, original preview/eagle/two-layer aura/rank/buy art, real wizard shots beyond base range, target-upgrade retention and source-sale cleanup verified; stationary high-HP fixture, not natural-wave/video acceptance')
}finally{await browser.close()}
