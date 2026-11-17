import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const towerArt=JSON.parse(readFileSync('public/data/towers-art.json')),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.25;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async art=>{
  const resource=name=>performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/'+name+'.ts')).name
  const {GameSession}=await import(resource('GameSession')),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){advance.call(this,dt);if(this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){window.legacyGame=this;window.legacySite=this.towers.sites.find(s=>s.id==='7')}}
  const {WorldRenderer}=await import(resource('WorldRenderer')),render=WorldRenderer.prototype.renderTowers;WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session===window.legacyGame)window.legacyWorld=this}
  const {AtlasSprite}=await import(resource('SpriteAtlas')),setFrame=AtlasSprite.prototype.setFrame;window.legacyFrames=[]
  AtlasSprite.prototype.setFrame=function(name,...args){if(Object.values(art).some(a=>name.startsWith(a.prefix+'_')&&Number(name.split('_').at(-1))>=a.from&&Number(name.split('_').at(-1))<=a.to))window.legacyFrames.push(name);return setFrame.call(this,name,...args)}
  const {AudioManager}=await import(resource('AudioManager')),trigger=AudioManager.prototype.trigger;window.legacySounds=[];AudioManager.prototype.trigger=function(name){window.legacySounds.push(name);return trigger.call(this,name)}
 },{attack:towerArt.animations.knights_order_soldier_lvl4_attack_2,stun:towerArt.animations.stun_small_loop})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.legacySite)
 async function clickSite(){const box=await page.locator('.viewport canvas').boundingBox(),p=await page.evaluate(()=>window.legacySite.pos);await page.mouse.click(box.x+(p.x+512/3)/(768*16/9)*box.width,box.y+(768-p.y)/768*box.height)}
 await clickSite();await confirmTowerAction(page,'兵营 · 70');await page.waitForFunction(()=>window.legacySite.tower)
 for(let i=0;i<3;i++){await clickSite();await confirmTowerAction(page,/^升级 ·/)}
 await page.waitForFunction(()=>window.legacyGame.barracks.soldiers.filter(s=>s.siteId==='7'&&s.name==='soldier_knights_lvl4'&&!s.deploying).length===3)
 await clickSite();for(let i=0;i<3;i++){const gold=await page.evaluate(()=>window.legacyGame.gold);await confirmTowerAction(page,'继承遗志 · 125');assert.equal(await page.evaluate(()=>window.legacyGame.gold),gold-125)}
 assert.equal(await page.getByRole('button',{name:'继承遗志 · 已满级',exact:true}).count(),1);await page.getByRole('button',{name:'取消',exact:true}).click()
 await page.waitForFunction(()=>window.legacyGame.knightLegacy.models.size===3&&window.legacyGame.barracks.soldiers.filter(s=>s.siteId==='7').every(s=>s.powerLevels.skill_c===3&&s.template.melee.attacks[1].cooldown===.4))
 await page.evaluate(()=>{const g=window.legacyGame;g.spawnCinematicEnemy('enemy_bandit',1,window.legacySite.rally);const e=g.enemies.at(-1);e.frozen=true;e.skillLocked=true;e.hp=e.template.health.hp_max=10000;Object.assign(e.path.position,window.legacySite.rally);window.legacyEnemy=e;window.legacyFallen=g.barracks.soldiers.find(s=>s.siteId==='7'&&s.slot===1);g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(window.legacyFallen,1000,{damage_type:1})})
 await page.waitForFunction(()=>window.legacyGame.knightLegacy.stuns.stuns.some(m=>m.applied));await page.waitForFunction(()=>window.legacyFrames.some(n=>n.startsWith('stun_small_'))&&window.legacyFrames.some(n=>n.startsWith('knights_order_soldier_lvl4_')))
 const active=await page.evaluate(()=>{const g=window.legacyGame,m=g.knightLegacy.stuns.stuns[0],id=g.entities.entity(m).id,art=window.legacyWorld.zefiraSkillsRenderer.stunSprites.get(`knight-legacy-${id}`);if(!art)throw Error('Missing knight stun renderer');let renderedKey;art.root.traverse(o=>{if(o.isMesh)renderedKey=o.userData.nativePaint?.key});return{renderedKey,boosted:[...g.knightLegacy.models].filter(m=>m.waitAt!==undefined).length,stun:g.enemies.at(-1).template.unit.stun_count,key:`${g.entities.entity(m).id}:sprite:1`}});assert(active.boosted>=1);assert(active.stun>=1);assert.equal(active.renderedKey,active.key)
 await page.screenshot({path:'analysis/web-knight-legacy-active.png'})
 await page.evaluate(()=>{const g=window.legacyGame;for(let i=0;i<330;i++)g.advance(1/30)})
 await page.waitForFunction(()=>[...window.legacyGame.knightLegacy.models].every(m=>m.waitAt===undefined));assert(await page.evaluate(()=>window.legacyGame.barracks.soldiers.filter(s=>s.siteId==='7'&&s.hp>0).every(s=>s.template.melee.attacks[0].disabled===false&&s.template.melee.attacks[1].disabled===true)))
 await page.waitForFunction(()=>window.legacyGame.knightLegacy.stuns.stuns.length===0);await page.screenshot({path:'analysis/web-knight-legacy-expired.png'})
 assert.equal((await page.evaluate(()=>window.legacySounds)).filter(n=>n==='TowerKnightsOrderSkillCTaunt').length,3);assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: normal knight build/three C purchases at125, original enhanced attack and stun atlas, actual damage-driven friendly death, native stun count and eight-second restoration with corpse not retriggering; quiet fixed target/accelerated expiry, not ordinary battle/video acceptance')
}finally{await browser.close()}
