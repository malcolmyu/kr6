import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroUpgrades:{hero_gerald:[],hero_zefira:[]}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{const r=performance.getEntriesByType('resource'),get=async n=>import(r.find(x=>x.name.includes('/src/game/'+n+'.ts')).name),{WorldRenderer}=await get('WorldRenderer'),{GameSession}=await get('GameSession'),render=WorldRenderer.prototype.renderEnemyEffects,advance=GameSession.prototype.advance;WorldRenderer.prototype.renderEnemyEffects=function(){render.call(this);window.lifeWorld=this;window.lifeRenderedAt=this.session.time};GameSession.prototype.advance=function(dt){if(!window.lifeFreeze)advance.call(this,dt)};window.lifeAdvance=advance})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'});await page.waitForFunction(()=>window.lifeWorld?.session?.heroes.zefira)
 await page.evaluate(()=>{window.lifeFreeze=true;const g=window.lifeGame=window.lifeWorld.session,h=g.heroes.zefira;window.lifeSounds=[];const sound=g.onSound;g.onSound=n=>{window.lifeSounds.push(n);sound(n)};g.heroes.gerald.scriptLocked=true;g.spawnCinematicEnemy('enemy_bandit',1,h.pos);const e=window.lifeEnemy=g.enemies.at(-1);e.frozen=true;e.hp=e.template.health.hp_max=2000;for(const a of e.template.melee.attacks)a.disabled=true;Object.assign(h.pos,{x:e.path.position.x-25,y:e.path.position.y});h.rally={...h.pos};h.center={...h.pos};h.deploying=false;h.moving=false;h.scriptLocked=false;g.paused=true})
 async function step(ticks=1){await page.evaluate(ticks=>{const g=window.lifeGame;g.paused=false;for(let i=0;i<ticks;i++)window.lifeAdvance.call(g,1/30);g.paused=true},ticks);await page.waitForFunction(()=>window.lifeRenderedAt===window.lifeGame.time)}
 async function until(fn,limit){for(let i=0;i<limit;i++){if(await page.evaluate(fn))return;await step()}assert.fail('Timed out: '+fn)}
 await until(()=>!!window.lifeGame.heroes.zefira.attack,150)
 await page.evaluate(()=>{const g=window.lifeGame,h=g.heroes.zefira;window.lifeHeroEntity=g.entities.entity(h);window.lifeOldTarget=h.target;g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(h,10000,{damage_type:2})});await step()
 assert(await page.evaluate(()=>{const h=window.lifeGame.heroes.zefira;return h.hp===0&&h.diedAt===undefined&&h.target===window.lifeOldTarget&&!!h.attack&&h.deathContinuation}))
 await step();assert(await page.evaluate(()=>{const g=window.lifeGame,h=g.heroes.zefira;return h.hp===0&&h.diedAt===undefined&&!h.attack&&h.target===window.lifeOldTarget&&!g.heroes.life.states.has(h)}))
 await step();assert(await page.evaluate(()=>{const g=window.lifeGame,h=g.heroes.zefira,s=g.heroes.life.states.get(h);return s.phase==='death'&&h.diedAt===g.time&&!h.target&&h.visualOverride.name==='death'&&!h.visualOverride.loop&&!h.lifeCanClick}));await page.screenshot({path:'analysis/web-hero-life-death.png'})
 await until(()=>!!window.lifeGame.heroes.life.states.get(window.lifeGame.heroes.zefira)?.tomb,35)
 assert(await page.evaluate(()=>{const g=window.lifeGame,h=g.heroes.zefira,m=window.lifeTomb=g.heroes.life.states.get(h).tomb;return m.pos===h.pos&&!g.entities.registry.entities.get(g.entities.entity(m).id)&&!window.lifeWorld.heroLifeRenderer.sprites.has(m)}));await step()
 assert(await page.evaluate(()=>{const g=window.lifeGame,m=window.lifeTomb;return g.entities.registry.entities.get(g.entities.entity(m).id)&&window.lifeWorld.heroLifeRenderer.sprites.has(m)}));await page.screenshot({path:'analysis/web-hero-life-grave.png'})
 // Advance the complete original dead lifetime through actual GameSession ticks.
 await step(850);await until(()=>window.lifeGame.heroes.life.states.get(window.lifeGame.heroes.zefira)?.phase==='respawn',100)
 assert(await page.evaluate(()=>{const g=window.lifeGame,h=g.heroes.zefira,m=window.lifeTomb;return h.hp===0&&h.ignoreDamage&&h.visualOverride.name==='level_up'&&m.tweenAt===g.time&&m.alpha===0&&g.entities.registry.entities.get(g.entities.entity(m).id)}));await page.screenshot({path:'analysis/web-hero-life-respawn.png'})
 await until(()=>!window.lifeGame.entities.registry.entities.get(window.lifeGame.entities.entity(window.lifeTomb).id),5)
 assert(await page.evaluate(()=>!window.lifeWorld.heroLifeRenderer.sprites.has(window.lifeTomb)))
 await until(()=>window.lifeGame.heroes.zefira.hp>0,30)
 assert(await page.evaluate(()=>{const g=window.lifeGame,h=g.heroes.zefira;return h.hp===h.template.health.hp_max&&!h.ignoreDamage&&h.lifeCanClick&&!g.heroes.life.states.has(h)&&g.entities.entity(h)===window.lifeHeroEntity&&!g.heroes.life.tombs.length&&h.deathHealthAt===undefined}))
 // Ordinary Gerald death also uses the same retained entity, without Zefira's grave.
 await page.evaluate(()=>{const g=window.lifeGame,h=g.heroes.gerald;h.scriptLocked=false;g.entities.allocate('damage');g.barracks.queueEnemyArrowDamage(h,10000,{damage_type:2})});await step();await step();assert(await page.evaluate(()=>window.lifeGame.heroes.life.states.get(window.lifeGame.heroes.gerald)?.phase==='death'));await step(105)
 assert(await page.evaluate(()=>{const g=window.lifeGame,h=g.heroes.gerald;return h.hp===0&&g.heroes.life.states.get(h).phase==='wait'&&!g.heroes.life.tombs.length}));await step(840);await until(()=>window.lifeGame.heroes.gerald.hp>0,40)
 assert(await page.evaluate(()=>{const h=window.lifeGame.heroes.gerald;return h.hp===h.template.health.hp_max&&!h.ignoreDamage&&!window.lifeGame.heroes.life.states.has(h)}))
 const sounds=await page.evaluate(()=>window.lifeSounds);assert(sounds.includes('HeroZefiraDeath'));assert(sounds.includes('HeroGeraldDeath'));assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Chrome both heroes: queued lethal health preserves current attack/target, own-main interruption/death, actual grave next-flush visibility, full native dead lifetime, grave alpha/tween/removal, original level-up respawn and full HP on retained entity; sound dispatch and no resource/page errors. Synthetic lethal packet, stationary durable target and quiet waves isolate life; not natural victory or heard-audio acceptance.')
}finally{await browser.close()}
