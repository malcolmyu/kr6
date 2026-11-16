import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{const resource=name=>performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/'+name+'.ts')).name,{GameSession}=await import(resource('GameSession')),advance=GameSession.prototype.advance;window.NodeRangePath=(await import(resource('EnemyPath'))).EnemyPath;GameSession.prototype.advance=function(dt){advance.call(this,dt);if(this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){window.nodeRangeSession=this;window.nodeRangeSite=this.towers.sites.find(s=>s.id==='6');for(const s of this.towers.sites)s.attackDisabled=s!==window.nodeRangeSite;for(const h of this.heroes.team)h.scriptLocked=true}}})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.nodeRangeSite)
 const box=await page.locator('.viewport canvas').boundingBox();await page.mouse.click(box.x+(541+512/3)/(768*16/9)*box.width,box.y+(768-443)/768*box.height);await confirmTowerAction(page,'法师塔 · 100');await page.waitForFunction(()=>window.nodeRangeSite.tower==='tower_wizard_lvl1')
 const range=await page.evaluate(()=>{const g=window.nodeRangeSession,site=window.nodeRangeSite;g.spawnCinematicEnemy('enemy_bandit',1,{x:502.41915438402555,y:346.05593040494193});const e=g.enemies.at(-1),p=new window.NodeRangePath(g.levelData.paths.paths,g.levelData.navigation,1,3);p.ni=109;Object.assign(p.position,{x:502.41915438402555,y:346.05593040494193});e.path=p;e.frozen=true;e.hp=10000;e.template.health.hp_max=10000;window.nodeRangeEnemy=e;const node=p.nativePrediction(0,0).pos,origin={x:541,y:455},dist=p=>(p.x-origin.x)**2+((p.y-origin.y)/.7)**2;return{current:dist(p.position),node:dist(node),accepted:g.combat.wizardTargets(site,[e]).map(e=>e.id),id:e.id}})
 assert(range.current>160**2);assert(range.node<160**2);assert.deepEqual(range.accepted,[range.id])
 await page.getByRole('button',{name:'开始战斗',exact:true}).click()
 await page.waitForFunction(()=>window.nodeRangeSession.combat.projectiles.some(p=>p.name==='bolt_tower_wizard_lvl1'&&p.target===window.nodeRangeEnemy))
 await page.screenshot({path:'analysis/web-wizard-node-range-bolt.png'})
 await page.waitForFunction(()=>window.nodeRangeEnemy.hp<10000);assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: real UI-built holder6 wizard fires and damages a controlled stationary EnemyPath actor at the actual native901 off-node range witness; continuous point is outside but current native path node is inside. No page/asset errors; isolated empty wave and frozen actor, not full video acceptance.')
}finally{await browser.close()}
