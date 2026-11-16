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
  const resource=p=>performance.getEntriesByType('resource').find(r=>r.name.includes(p)).name,{GameSession}=await import(resource('/src/game/GameSession.ts')),{PathFollower}=await import(resource('/src/game/PathFollower.ts')),{ExoSprite}=await import(resource('/src/game/ExoSprite.ts')),{WorldRenderer}=await import(resource('/src/game/WorldRenderer.ts')),advance=GameSession.prototype.advance,animate=ExoSprite.prototype.animate,render=WorldRenderer.prototype.renderTowers
  ExoSprite.prototype.animate=function(...args){this.observedAnimation={name:args[0],elapsed:args[1],loop:args[2],fps:args[3]};animate.call(this,...args)}
  WorldRenderer.prototype.renderTowers=function(){render.call(this);window.archerWorld=this;if(!this.session?.shooterFixture)return;const visual=this.towerVisuals.get(this.session.shooterFixtureSite.id);if(visual)window.archerVisuals=visual.parts.filter(p=>p.config.prefix==='archer3Def'||p.config.prefix==='archer3_overborderDef').map(p=>({prefix:p.config.prefix,x:p.config.offset.x,visible:p.art.root.visible,flip:p.art.root.scale.x,name:p.art.observedAnimation?.name,elapsed:p.art.observedAnimation?.elapsed}))}
  GameSession.prototype.advance=function(dt){
   if(!this.shooterFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    this.shooterFixture=true;this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
    const site=this.towers.sites.filter(s=>!s.tower&&!s.building).reduce((a,b)=>Math.hypot(a.pos.x-713,a.pos.y-278)<Math.hypot(b.pos.x-713,b.pos.y-278)?a:b);site.attackDisabled=false;this.shooterFixtureSite=site;this.build(site.id,'archers')
    const pos={x:site.pos.x-100,y:site.pos.y-50};this.spawnCinematicEnemy('enemy_bandit',1,pos);const e=this.enemies.at(-1);e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.hp=5000;e.template.health.hp_max=5000;e.template.motion.max_speed=0;window.shooterFixtureTarget=e;window.shooterFixtureSite=site
   }
   advance.call(this,dt)
   if(this.shooterFixtureSite?.tower?.match(/^tower_archers_lvl[12]$/)&&!this.shooterFixtureSite.building&&!this.entities.registry.pendingInserts.some(e=>e.template.startsWith('tower_archers_')))this.upgradeTower(this.shooterFixtureSite.id)
   if(this.shooterFixture){window.shooterFixtureGame=this;window.shooterControllers=[...this.combat.archerControllers].map(c=>({sid:c.sid,key:c.key,id:this.entities.entity(c)?.id,live:!!this.entities.registry.entities.get(this.entities.entity(c)?.id)}))}
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.archerVisuals?.some(p=>p.prefix==='archer3Def'&&p.x===15&&p.name==='shoot')&&window.archerVisuals?.some(p=>p.prefix==='archer3Def'&&p.x===0&&p.name==='shootback'),{},{timeout:12000}).catch(async e=>{console.log(await page.evaluate(()=>window.archerVisuals),errors,missing);throw e})
 await page.waitForFunction(()=>window.shooterControllers?.filter(c=>c.key==='tower_archers_lvl3'&&c.live).length===3)
 const life=await page.evaluate(()=>({controllers:window.shooterControllers,old:[...window.shooterFixtureGame.entities.registry.entities.values()].filter(e=>e.template==='controller_archers_shooter').length}));assert.equal(life.old,3);assert(life.controllers.every(c=>c.key==='tower_archers_lvl3'&&c.live))
 const actors=await page.evaluate(()=>window.archerVisuals)
 assert(actors.filter(p=>p.prefix==='archer3Def'&&p.name.startsWith('shoot')).every(p=>p.flip===-1))
 await page.screenshot({path:'analysis/web-native-archer-independent-shooters.png'})
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/PathFollower.ts')).name,{PathFollower}=await import(url),site=window.shooterFixtureSite,pos={x:site.pos.x-100,y:site.pos.y+30};window.shooterFixtureTarget.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}])})
 await page.waitForFunction(()=>window.archerVisuals?.some(p=>p.prefix==='archer3_overborderDef'&&!p.visible)&&window.archerVisuals?.some(p=>p.prefix==='archer3_overborderDef'&&p.visible),{},{timeout:12000}).catch(async e=>{console.log(await page.evaluate(()=>({visuals:window.archerVisuals,pos:window.shooterFixtureTarget.path.position,site:window.shooterFixtureSite.pos})),errors,missing);throw e})
 await page.screenshot({path:'analysis/web-native-archer-bow-occlusion.png'})
 await page.waitForFunction(()=>window.shooterFixtureGame.combat.projectiles.some(p=>p.arrowMotion&&!p.done))
 const miss=await page.evaluate(()=>{const g=window.shooterFixtureGame;g.paused=true;window.shooterFixtureTarget.path.position.y+=400;g.paused=false;for(let i=0;i<45;i++){g.advance(1/30);const m=g.staticEffects.models.find(m=>m.name==='decal_archers_miss_1');if(m&&g.time>m.at){window.archerMiss=m;break}}g.paused=true;return !!window.archerMiss});assert(miss,'a fired real arrow misses the teleported fixture target')
 await page.waitForFunction(()=>window.archerWorld.staticEffectRenderer.sprites.has(window.archerMiss))
 const first=await page.evaluate(()=>{const w=window.archerWorld,m=window.archerMiss,s=w.staticEffectRenderer.sprites.get(m)[0];return{children:s.root.children.length,visible:s.root.visible,alpha:m.sprites[0].alpha}});assert(first.children>0&&first.visible);assert.equal(first.alpha,255)
 await page.evaluate(()=>{const g=window.shooterFixtureGame;g.paused=false;g.advance(3);g.paused=true})
 await page.waitForFunction(()=>window.archerWorld.staticEffectRenderer.sprites.get(window.archerMiss)?.[0].opacity<1)
 const fade=await page.evaluate(()=>({alpha:window.archerMiss.sprites[0].alpha,opacity:window.archerWorld.staticEffectRenderer.sprites.get(window.archerMiss)[0].opacity}));assert(fade.alpha>0&&fade.alpha<255);assert(Math.abs(fade.opacity-fade.alpha/255)<1e-12)
 await page.screenshot({path:'analysis/web-native-archer-miss-decal.png'})
 await page.evaluate(()=>{const g=window.shooterFixtureGame;g.paused=false;g.advance(2);g.paused=true})
 await page.waitForFunction(()=>!window.archerWorld.staticEffectRenderer.sprites.has(window.archerMiss))
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser real archer build→upgrade2→upgrade3 fixture: previous shooter controllers removed and three new live controllers registered; front and rear shooters independently animate in opposite vertical directions, left-facing shooters flip individually, front bows hide independently after target moves upward; a real missed arrow creates an EXO decal with native tween fade and removal; no page or asset errors. Full waves remain pending.')
}finally{await browser.close()}
