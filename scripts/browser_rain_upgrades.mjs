import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 for(const branch of ['slow','extra']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
  await page.addInitScript(branch=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},powerXp:{rain_of_fire:90000},powerUpgrades:{rain_of_fire:['l2a','l3',branch==='slow'?'l4a':'l4b',branch==='slow'?'l5a':'l5b','l6']}}))},branch)
  await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
  await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
  await page.evaluate(async()=>{
   const resources=performance.getEntriesByType('resource'),url=name=>resources.find(r=>r.name.includes(`/src/game/${name}.ts`)).name,{GameSession}=await import(url('GameSession')),{PathFollower}=await import(url('PathFollower')),{AtlasSprite}=await import(url('SpriteAtlas')),{AudioManager}=await import(url('AudioManager')),advance=GameSession.prototype.advance,setFrame=AtlasSprite.prototype.setFrame,trigger=AudioManager.prototype.trigger
   window.rainFrames=new Set();window.rainSounds=[];AtlasSprite.prototype.setFrame=function(name,...args){if(name.startsWith('rain_of_fire_'))window.rainFrames.add(name);return setFrame.call(this,name,...args)};AudioManager.prototype.trigger=function(name,...args){window.rainSounds.push(name);return trigger.call(this,name,...args)}
   GameSession.prototype.advance=function(dt){
    if(this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
     this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
     if(!this.rainFixture){this.rainFixture=true;const pos={x:550,y:315};this.spawnCinematicEnemy('enemy_bandit',1,pos);const enemy=this.enemies.at(-1);enemy.path=new PathFollower([pos,{x:1000,y:315}]);enemy.hp=10000;enemy.template.health.hp_max=10000;enemy.template.motion.max_speed=60;enemy.frozen=true;enemy.template.melee=undefined;window.rainFixture={game:this,enemy};window.rainSeen={burn:false,scorch:false,slow:false,extra:false}}
    }
    advance.call(this,dt)
    if(this.rainFixture){const a=this.powers.rainAreas,seen=window.rainSeen;seen.burn||=a.burns.size>0;seen.scorch||=a.scorches.length>0;seen.slow||=window.rainFixture.enemy.template.motion.max_speed===24;seen.extra||=a.explosions.some(e=>e.hit)}
   }
  })
  await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page);await page.getByRole('button',{name:'开始战斗',exact:true}).click();const confirm=page.getByRole('button',{name:'确认出击',exact:true});if(await confirm.count())await confirm.click()
  const canvas=await page.locator('.viewport canvas').boundingBox(),point={x:canvas.x+(550+512/3)/(768*16/9)*canvas.width,y:canvas.y+(768-315)/768*canvas.height}
  await page.waitForFunction(()=>!document.querySelector('[data-power=rain_of_fire]').disabled);await page.keyboard.press('2');await page.waitForFunction(()=>document.querySelector('[data-power=rain_of_fire]').getAttribute('aria-pressed')==='true');await page.mouse.click(point.x,point.y)
  await page.waitForFunction(()=>window.rainSeen?.burn&&window.rainSeen?.scorch)
  if(branch==='extra')await page.waitForFunction(()=>window.rainFixture.game.powers.rainAreas.explosions.some(x=>x.hit));else await page.waitForFunction(()=>window.rainSeen?.slow)
  await page.screenshot({path:`analysis/web-rain-${branch}-active.png`})
  assert.equal(await page.evaluate(()=>window.rainFixture.game.powers.cooldowns.rain_of_fire),45)
  await page.waitForFunction(()=>{const a=window.rainFixture.game.powers.rainAreas,p=window.rainFixture.game.powers;return window.rainSeen.burn&&p.rainControl.casts.length===0&&p.meteors.length===0&&a.areas.length===0&&a.scorches.length===0&&a.explosions.length===0&&a.burns.size===0&&a.slows.size===0})
  const seen=await page.evaluate(()=>window.rainSeen),frames=await page.evaluate(()=>[...window.rainFrames]),sounds=await page.evaluate(()=>window.rainSounds)
  assert.deepEqual(seen,{burn:true,scorch:true,slow:branch==='slow',extra:branch==='extra'});assert(frames.some(n=>n.startsWith('rain_of_fire_burning_mod_')));assert(frames.some(n=>n.startsWith('rain_of_fire_decal2_')));if(branch==='extra')assert(frames.some(n=>n.startsWith('rain_of_fire_hit_explosion_')))
  assert.equal(sounds.filter(n=>n==='PowersRainOfFireCast').length,branch==='extra'?10:8);assert.equal(sounds.filter(n=>n==='PowersRainOfFireImpact').length,branch==='extra'?10:8)
  assert(await page.evaluate(()=>window.rainFixture.enemy.hp<9900));assert.equal(await page.evaluate(()=>window.rainFixture.enemy.template.motion.max_speed),60);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await page.close()
 }
 console.log('Browser: both ordinary rank6 fire casts restore8/10 cataclysm meteors,45s cooldown, original scorch/burn/explosion art, actual damage/slow and audio triggers, independent branches and complete timed cleanup; no page/asset errors')
}finally{await browser.close()}
