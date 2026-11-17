import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const healAnimation=JSON.parse(readFileSync('public/data/towers-art.json')).animations.knights_order_soldier_lvl4_heal
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(names=>window.healAtlasNames=new Set(names),Array.from({length:healAnimation.to-healAnimation.from+1},(_,i)=>`${healAnimation.prefix}_${String(healAnimation.from+i).padStart(4,'0')}`))
 await page.evaluate(async()=>{
  const resource=name=>performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/'+name+'.ts')).name
  const {GameSession}=await import(resource('GameSession')),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){const hp=window.healSoldier?.hp;advance.call(this,dt);if(this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){window.healGame=this;window.healSite=this.towers.sites.find(s=>s.id==='7');if(!this.healObserved){this.healObserved=true;const onSound=this.onSound;this.onSound=name=>{window.healSounds.push(name);onSound(name)}}}if(hp!==undefined&&window.healSoldier.hp>hp)window.healPulses.push(window.healSoldier.hp-hp)}
  const {WorldRenderer}=await import(resource('WorldRenderer')),render=WorldRenderer.prototype.renderTowers;WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session===window.healGame)window.healWorld=this}
  const {AudioManager}=await import(resource('AudioManager')),trigger=AudioManager.prototype.trigger;window.healAudioRequests=[];AudioManager.prototype.trigger=function(name){window.healAudioRequests.push(name);return trigger.call(this,name)}
  const {AtlasSprite}=await import(resource('SpriteAtlas')),setFrame=AtlasSprite.prototype.setFrame;window.healFrames=[];window.healSounds=[];window.healPulses=[]
  AtlasSprite.prototype.setFrame=function(name,...args){if(window.healAtlasNames.has(name))window.healFrames.push(name);return setFrame.call(this,name,...args)}
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.healSite)
 async function clickSite(){const box=await page.locator('.viewport canvas').boundingBox(),p=await page.evaluate(()=>window.healSite.pos);await page.mouse.click(box.x+(p.x+512/3)/(768*16/9)*box.width,box.y+(768-p.y)/768*box.height)}
 await clickSite();await confirmTowerAction(page,'兵营 · 70');await page.waitForFunction(()=>window.healSite.tower)
 for(let i=0;i<3;i++){await clickSite();await confirmTowerAction(page,/^升级 ·/)}
 await page.waitForFunction(()=>window.healGame.barracks.soldiers.filter(s=>s.siteId==='7'&&s.name==='soldier_knights_lvl4'&&!s.deploying).length===3)
 await page.evaluate(()=>{const g=window.healGame;window.healSoldier=g.barracks.soldiers.find(s=>s.siteId==='7'&&s.slot===1);g.spawnCinematicEnemy('enemy_bandit',1,window.healSite.rally);const e=g.enemies.at(-1);e.frozen=true;e.skillLocked=true;e.hp=e.template.health.hp_max=10000;Object.assign(e.path.position,window.healSite.rally)})
 for(const [index,pulse]of [25,40,60].entries()){
  await clickSite();const gold=await page.evaluate(()=>window.healGame.gold);await confirmTowerAction(page,'战斗坚韧 · 180');assert.equal(await page.evaluate(()=>window.healGame.gold),gold-180);await page.getByRole('button',{name:'取消',exact:true}).click()
  const cast=await page.evaluate(()=>{const g=window.healGame,s=window.healSoldier;g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(s,s.hp-50,{damage_type:1});window.healPulses=[];let i=0;for(;i<1000&&!g.knightHeal.state(s).cast;i++)g.advance(1/30);if(!g.knightHeal.state(s).cast)throw Error('No actual heal cast '+JSON.stringify({hp:s.hp,dead:s.deathHealthAt,pose:s.visualOverride,pos:s.pos,target:s.target?.name,skill:s.powerLevels,changes:[...s.powerChanges??[]],heal:g.knightHeal.state(s),enemy:g.enemies.map(e=>({hp:e.hp,pos:e.path.position,node:e.path.ni,finished:e.path.finished}))}));g.paused=true;return {hp:s.hp,rank:s.powerLevels.skill_b}});assert.equal(cast.hp,50);assert.equal(cast.rank,index+1)
  await page.evaluate(()=>{window.healGame.paused=false;for(let i=0;i<10;i++)window.healGame.advance(1/30);window.healGame.paused=true});await page.waitForFunction(()=>window.healFrames.length>0);await page.screenshot({path:`analysis/web-knight-heal-rank${index+1}.png`})
  const result=await page.evaluate(()=>{const g=window.healGame,s=window.healSoldier;g.paused=false;for(let i=0;i<50&&g.knightHeal.state(s).cast;i++)g.advance(1/30);g.paused=true;return{hp:s.hp,pulses:window.healPulses}});assert.deepEqual(result.pulses,[pulse,pulse]);assert.equal(result.hp,50+pulse*2)
  await page.evaluate(()=>window.healGame.paused=false)
 }
 await clickSite();assert.equal(await page.getByRole('button',{name:'战斗坚韧 · 已满级',exact:true}).count(),1)
 await page.getByRole('button',{name:'取消',exact:true}).click()
 const corpse=await page.evaluate(()=>{const g=window.healGame,s=window.healSoldier;g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(s,s.hp-50,{damage_type:1});for(let i=0;i<1000&&!g.knightHeal.state(s).cast;i++)g.advance(1/30);if(!g.knightHeal.state(s).cast)throw Error('No fourth heal');while(g.knightHeal.state(s).cast.phase===1)g.advance(1/30);g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(s,1000,{damage_type:1});g.advance(1/30);for(let i=0;i<50&&g.knightHeal.state(s).cast;i++)g.advance(1/30);g.advance(1/30);g.paused=true;return{hp:s.hp,dead:s.deathHealthAt!==undefined,hidden:s.healthBarHidden,attack:!!s.attack}})
 assert.deepEqual(corpse,{hp:60,dead:true,hidden:true,attack:false});await page.waitForFunction(()=>!window.healWorld.healthBars.bars.has(`soldier-${window.healSoldier.id}`));assert(await page.evaluate(()=>window.healWorld.soldierSprites.has(window.healSoldier.id)));await page.screenshot({path:'analysis/web-knight-heal-dead-positive-hp.png'})
 const names=await page.evaluate(()=>window.healSounds);assert(names.filter(n=>n==='TowerKnightsOrderResilienceCast').length>=3);assert((await page.evaluate(()=>window.healAudioRequests)).filter(n=>n==='TowerKnightsOrderSkillATaunt').length>=3)
 assert((await page.evaluate(()=>window.healFrames)).length>0);assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: normal knight build and three B purchases at180 each, native heal atlas and actual cast/purchase sound requests, exact two-pulse25/40/60 HP restoration and dead positive-HP corpse retains hidden health bar; quiet frozen target and accelerated cooldowns, not ordinary battle/video acceptance')
}finally{await browser.close()}
