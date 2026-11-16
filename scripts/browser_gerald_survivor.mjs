import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_gerald:22000},heroUpgrades:{hero_gerald:['skill_a','upg_a','upg_d','upg_b','skill_c']}})))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=name=>performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/'+name+'.ts')).name
  const {GameSession}=await import(resource('GameSession')),{WorldRenderer}=await import(resource('WorldRenderer')),{damageSoldier}=await import(resource('SoldierHealth')),advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderEnemyEffects
  WorldRenderer.prototype.renderEnemyEffects=function(){render.call(this);const g=this.session,e=g?.survivorTarget;if(!e)return;window.survivorRendered={tick:g.tick,body:this.sprites.get(e.id)?.root.visible===true,shadow:this.enemyShadows.get(e.id)?.root.visible===true}}
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(this.survivorFixture===undefined&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')&&this.heroes.gerald&&this.heroes.survivor.nativeLastCast!==undefined&&this.tick>3){
    this.survivorSounds=[];const sound=this.onSound;this.onSound=name=>{this.survivorSounds.push(name);sound(name)}
    this.survivorEffects=[];for(const owner of [this.heroes.survivor,this.enemyTeleports]){const effect=owner.onEffect;owner.onEffect=(name,pos,time)=>{this.survivorEffects.push(name);effect(name,pos,time)}}
    this.spawn({enemy:'enemy_bandit',pi:3,spi:1},this.time);this.survivorTarget=this.pendingEnemies.at(-1).enemy;this.survivorFixture='pending'
   }
   if(this.survivorFixture==='pending'&&this.enemies.includes(this.survivorTarget)&&this.entities.registry.entities.get(this.entities.entity(this.survivorTarget)?.id)){
    const h=this.heroes.gerald,e=this.survivorTarget;e.path.ni=100;Object.assign(e.path.position,this.levelData.paths.paths[2][0][99]);e.frozen=true
    Object.assign(h.pos,{x:e.path.position.x-35,y:e.path.position.y-15});h.rally={...h.pos};h.center={...h.pos};h.deploying=false;h.moving=false;h.scriptLocked=false;h.target=e;h.attack=undefined
    damageSoldier(h,{value:1000,damage_type:1},this.time);this.survivorFixture=this.time
   }
   if(typeof this.survivorFixture==='number'){const h=this.heroes.gerald,e=this.survivorTarget;window.survivorObservation={effects:this.survivorEffects,sounds:this.survivorSounds,age:this.time-this.survivorFixture,level:this.heroes.survivor.level,hp:h.hp,maxHp:h.template.health.hp_max,animation:h.visualOverride?.name??h.attack?.attack.animation??(h.moving?'walk':'idle'),hidden:!!e.teleportHidden,teleporting:!!e.teleporting,bans:e.template.vis.bans,ignore:!!e.template.health.ignore_damage,modifierRegistered:[...this.entities.bindingsInOrder('enemyTeleport')].some(b=>b.model.enemy===e),ni:e.path.ni,count:e.teleportCount??0,barHidden:h.template.health_bar.hidden}}
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 await page.waitForFunction(()=>window.survivorObservation?.animation==='fated_survivor').catch(async error=>{console.log('Survivor browser diagnostic',await page.evaluate(()=>window.survivorObservation),errors);throw error});assert.equal(await page.evaluate(()=>window.survivorObservation.level),1)
 await page.screenshot({path:'analysis/web-gerald-survivor-cast.png'})
 await page.waitForFunction(()=>window.survivorObservation.hp>0&&window.survivorObservation.hidden);const healed=await page.evaluate(()=>window.survivorObservation);assert.equal(healed.hp,healed.maxHp*.4);assert.equal(healed.barHidden,false);assert.equal(healed.count,1);assert.equal(healed.bans,-1);assert(healed.ignore&&healed.modifierRegistered);await page.waitForFunction(()=>window.survivorRendered&&!window.survivorRendered.body&&!window.survivorRendered.shadow)
 await page.screenshot({path:'analysis/web-gerald-survivor-revived.png'})
 await page.waitForFunction(()=>window.survivorObservation.ni<100&&window.survivorObservation.count===1&&!window.survivorObservation.teleporting);const returned=await page.evaluate(()=>window.survivorObservation);assert.equal(returned.bans,0);assert.equal(returned.ignore,false);assert.equal(returned.modifierRegistered,false);await page.waitForFunction(()=>window.survivorRendered?.body);await page.screenshot({path:'analysis/web-gerald-survivor-teleport.png'})
 await page.waitForFunction(()=>window.survivorObservation.age>5);assert.equal(await page.evaluate(()=>window.survivorObservation.animation),'idle')
 const observed=await page.evaluate(()=>window.survivorObservation);assert(observed.sounds.includes('HeroGeraldFatedSurvivorCast'));assert.equal(observed.effects.filter(n=>n==='fx_gerald_skill_c_teleport').length,2);assert(observed.effects.includes('decal_gerald_skill_c'))
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);writeFileSync('analysis/browser-survivor-runtime.json',JSON.stringify({note:'Controlled registered/frozen enemy and lethal packet; real renderer, not an ordinary wave playthrough.',healed,returned,final:observed,rendered:await page.evaluate(()=>window.survivorRendered)},null,2)+'\n')
 console.log('Browser survivor damage fixture: purchased native skill, real lethal damage, original 2s recovery/40% HP and visible health bar, enemy disappears/returns at a valid earlier path node, original EXOs, no JS/asset errors')
}finally{await browser.close()}
