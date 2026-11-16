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
  const resource=part=>performance.getEntriesByType('resource').find(r=>r.name.includes(part)).name,{GameSession}=await import(resource('/src/game/GameSession.ts')),{PathFollower}=await import(resource('/src/game/PathFollower.ts')),{ExoSprite}=await import(resource('/src/game/ExoSprite.ts')),original=GameSession.prototype.advance,animate=ExoSprite.prototype.animate
  ExoSprite.prototype.animate=function(name,elapsed,loop){animate.call(this,name,elapsed,loop);if(name==='miss')window.arrowMissObservation={elapsed,loop,opacity:this.opacity}}
  GameSession.prototype.advance=function(dt){
   if(!this.arrowFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    this.arrowFixture=true;this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
    const site=this.towers.sites.reduce((a,b)=>Math.hypot(a.pos.x-713,a.pos.y-278)<Math.hypot(b.pos.x-713,b.pos.y-278)?a:b)
    site.tower='tower_archers_lvl1';site.attackDisabled=false;this.arrowFixtureSite=site
    const pos={x:site.pos.x-70,y:site.pos.y};this.spawnCinematicEnemy('enemy_bandit',1,pos);const e=this.enemies.at(-1);e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.hp=500;e.template.health.hp_max=500;e.template.motion.max_speed=0;this.arrowFixtureTarget=e
    const draw=this.combat.onEffect;this.combat.onEffect=(name,pos,time,transform)=>{(this.arrowFixtureEffects??=[]).push({name,time});draw(name,pos,time,transform)}
   }
   original.call(this,dt)
   if(this.arrowFixture){
    const arrow=this.combat.projectiles.find(p=>p.arrowMotion);if(arrow){this.arrowFixtureSite.attackDisabled=true;if(this.time-arrow.born>.2&&!this.arrowFixtureWarped){this.arrowFixtureWarped=true;const pos={x:this.arrowFixtureTarget.path.position.x+250,y:this.arrowFixtureTarget.path.position.y+100};this.arrowFixtureTarget.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}])}}
    window.arrowObservation={time:this.time,hp:this.arrowFixtureTarget.hp,projectiles:this.combat.projectiles.filter(p=>p.arrowMotion).map(p=>({age:this.time-p.born,rotation:p.rotation,hidden:p.arrowMotion.hidden,duration:p.duration})),effects:this.arrowFixtureEffects??[]}
   }
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.arrowObservation?.projectiles.some(p=>p.age>.1&&!p.hidden))
 const flying=await page.evaluate(()=>window.arrowObservation.projectiles[0]);assert(Math.abs(flying.duration-Math.sqrt(.4))<1e-9)
 await page.screenshot({path:'analysis/web-tower-arrow-native-flight.png'})
 await page.waitForFunction(()=>window.arrowMissObservation?.elapsed>.2,{},{timeout:5000}).catch(async e=>{console.log(await page.evaluate(()=>({arrow:window.arrowObservation,miss:window.arrowMissObservation})),errors,missing);await page.screenshot({path:'analysis/web-arrow-fixture-failure.png'});throw e})
 assert.equal(await page.evaluate(()=>window.arrowObservation.hp),500)
 await page.screenshot({path:'analysis/web-tower-arrow-native-miss.png'})
 await page.waitForFunction(()=>window.arrowMissObservation.elapsed>2.4)
 const miss=await page.evaluate(()=>window.arrowMissObservation);assert.equal(miss.loop,false);assert(miss.opacity>0&&miss.opacity<1)
 await page.screenshot({path:'analysis/web-tower-arrow-miss-fade.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser controlled arrow fixture: original fixed-height flight, target moves away and takes no damage, native EXO miss holds its final frame then fades over the original four-second lifetime; no missing assets or page errors. Natural six-stage validation remains pending.')
}finally{await browser.close()}
