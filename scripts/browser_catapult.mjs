import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:450},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),pathUrl=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/PathFollower.ts')).name,{PathFollower}=await import(pathUrl),original=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   if(!this.catapultFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    this.catapultFixture=true;this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
    const site=this.towers.sites.reduce((a,b)=>Math.hypot(a.pos.x-713,a.pos.y-278)<Math.hypot(b.pos.x-713,b.pos.y-278)?a:b)
    site.tower='tower_catapult_lvl1';site.attackDisabled=false
    for(const dx of [0,25]){
     const pos={x:site.pos.x-70+dx,y:site.pos.y};this.spawnCinematicEnemy('enemy_bandit',1,pos);const e=this.enemies.at(-1);e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.hp=500;e.template.health.hp_max=500;e.template.motion.max_speed=0
    }
    const draw=this.combat.onEffect;this.combat.onEffect=(name,pos,time)=>{(this.catapultEffects??=[]).push({name,time});draw(name,pos,time)}
   }
   original.call(this,dt)
   if(this.catapultFixture)window.catapultObservation={time:this.time,projectiles:this.combat.projectiles.filter(p=>p.bombMotion).map(p=>({age:this.time-p.born,rotation:p.rotation,hidden:p.bombMotion.hidden})),hp:this.enemies.map(e=>e.hp),effects:this.catapultEffects??[]}
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.catapultObservation?.projectiles.some(p=>p.age>.2&&!p.hidden))
 await page.screenshot({path:'analysis/web-catapult-flight-spin.png'})
 await page.waitForFunction(()=>window.catapultObservation?.effects.some(e=>e.name==='decal_bomb_crater_KR5'))
 const observed=await page.evaluate(()=>window.catapultObservation)
 assert.equal(observed.hp[0],481);assert.equal(observed.hp[1],484)
 await page.screenshot({path:'analysis/web-catapult-native-explosion.png'})
 await page.waitForTimeout(600);await page.screenshot({path:'analysis/web-catapult-native-crater.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser controlled catapult fixture: spinning/hiding original projectile, native center damage19 vs distance damage16, explosion and original ground crater render; no missing assets or page errors. Natural six-stage strategy remains unverified.')
}finally{await browser.close()}
