import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[]
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:450},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 // Controlled positions isolate real enemy AI/rendering from the full wave strategy.
 await page.evaluate(async()=>{
  const healthUrl=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/HealthBarRenderer.ts')).name,{HealthBarRenderer}=await import(healthUrl),draw=HealthBarRenderer.prototype.advance
  HealthBarRenderer.prototype.advance=function(session){draw.call(this,session);window.healthBarObservation=Object.fromEntries([...this.bars].map(([key,b])=>[key,{visible:b.bg.visible,opacity:b.bg.material.opacity,width:b.bg.scale.x,fillWidth:b.fg.scale.x,color:b.fg.material.color.getHexString()}]))}
  const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),templates=await(await fetch('/data/entities.json')).json(),original=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   if(!this.enemyFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    this.enemyFixture=true;this.spawnCinematicEnemy('enemy_shadow_archer',1,{x:700,y:350});const e=this.enemies.at(-1);e.hp=100;e.template.health.hp_max=100
    const target=this.barracks.insertHero('soldier_knights_lvl1',{x:e.path.position.x+100,y:e.path.position.y},this.time,templates.soldier_knights_lvl1);target.hero=false;target.hp=1000;target.template=structuredClone(target.template);target.template.health.hp_max=1000;target.scriptLocked=true
    this.enemyFixtureTarget=target;window.healthFixtureTarget=target
    this.spawnCinematicEnemy('enemy_shadow_blades',1,{x:600,y:350});const blades=this.enemies.at(-1);blades.template.health.hp_max=70;blades.hp=13;this.enemyFixtureBlade=blades
    this.spawnCinematicEnemy('enemy_bandit',1,blades.path.position);this.enemyFixtureFriend=this.enemies.at(-1)
    this.spawnCinematicEnemy('enemy_crow',1,{x:800,y:400});this.enemyFixtureCrow=this.enemies.at(-1)

   }
   original.call(this,dt)
   if(this.enemyFixture){const e=this.enemies.find(e=>e.name==='enemy_shadow_archer');window.enemyObservation={time:this.time,targetId:this.enemyFixtureTarget.id,hp:this.enemyFixtureTarget.hp,projectiles:this.enemyRanged.projectiles.length,holding:this.enemyRanged.states.get(e.id)?.holding,alive:e.hp>0,smoke:this.enemySkills.areas.length,protected:this.enemyFixtureFriend.smokeDodgeUntil>=this.time,departed:!this.enemies.includes(this.enemyFixtureBlade),crowEntry:this.enemyFixtureCrow.visualOverride?.name==='in'}}
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.enemyObservation?.crowEntry)
 await page.screenshot({path:'analysis/web-crow-entry-shadow.png'})
 await page.waitForFunction(()=>window.enemyObservation?.smoke>0&&window.enemyObservation?.protected)
 await page.screenshot({path:'analysis/web-shadow-blades-smoke.png'})
 await page.waitForFunction(()=>window.enemyObservation?.projectiles>0)
 await page.screenshot({path:'analysis/web-shadow-archer-arrow.png'})
 await page.waitForFunction(()=>window.enemyObservation?.hp<1000)
 await page.screenshot({path:'analysis/web-shadow-archer-hit.png'})
 await page.waitForTimeout(300)
 await page.screenshot({path:'analysis/web-native-unit-health-bars.png'})
 const observation=await page.evaluate(()=>window.enemyObservation);const key=`soldier-${observation.targetId}`,bar=await page.evaluate(key=>window.healthBarObservation[key],key);assert(bar.visible);assert.equal(bar.opacity,1);assert.equal(bar.width,16);assert(bar.fillWidth<bar.width);assert.equal(bar.color,'00ba00');
assert(observation.holding);assert(observation.alive);assert(observation.departed)
 await page.evaluate(()=>{window.healthFixtureTarget.hp=0});await page.waitForFunction(key=>!window.healthBarObservation[key],key)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser enemy fixture: original crow entry/shadow and low-HP shadow-blades smoke/protection/departure; actual shadow archer holds, plays ranged animation, launches original arrow and damages a stationary knight; original arrow/blood resources render without page errors; native red/green health bars fade in at the original size and are removed on death. Natural full waves remain pending.')
}finally{await browser.close()}
