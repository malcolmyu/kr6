import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const animations=JSON.parse(readFileSync('public/data/reinforcements.json')).animations
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},powerXp:{reinforcements:90000},powerUpgrades:{reinforcements:['l2a','l3','l4a','l5a','l6']}})))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),url=stem=>resources.find(r=>r.name.includes(`/src/game/${stem}.ts`)).name,{GameSession}=await import(url('GameSession')),{PathFollower}=await import(url('PathFollower')),{AtlasSprite}=await import(url('SpriteAtlas')),{AudioManager}=await import(url('AudioManager')),{meleeSlot}=await import(url('UnitPositions')),advance=GameSession.prototype.advance,setFrame=AtlasSprite.prototype.setFrame,trigger=AudioManager.prototype.trigger
  const {WorldRenderer}=await import(url('WorldRenderer')),renderTowers=WorldRenderer.prototype.renderTowers
  WorldRenderer.prototype.renderTowers=function(){renderTowers.call(this);if(this.session===window.reinfGame)window.reinfWorld=this}
  window.reinfFrames=new Set();window.reinfPhases=new Set();window.reinfSounds=new Set();AtlasSprite.prototype.setFrame=function(name,...args){if(name.startsWith('reinforcements_lvl3_'))window.reinfFrames.add(name);return setFrame.call(this,name,...args)};AudioManager.prototype.trigger=function(name,...args){window.reinfSounds.add(name);return trigger.call(this,name,...args)}
  GameSession.prototype.advance=function(dt){
   if(this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    window.reinfGame=this;this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
    const special=this.barracks.soldiers.find(s=>s.name==='soldier_reinforcement_special')
    if(special&&!this.reinfFixture){this.reinfFixture=true;this.barracks.soldiers.filter(s=>s.name==='soldier_reinforcement_base').forEach(s=>s.scriptLocked=true);const pos={x:special.pos.x-40,y:special.pos.y};this.spawnCinematicEnemy('enemy_bandit',1,pos);const enemy=this.enemies.at(-1);enemy.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);enemy.hp=5000;enemy.template.health.hp_max=5000;enemy.template.motion.max_speed=0;enemy.template.melee=undefined
     special.pos=meleeSlot(1,pos,0,enemy.template.enemy.melee_slot??{x:30,y:0},special.template.soldier.melee_slot_offset,special.template.soldier.melee_slot_spread??{x:-3,y:-6});special.rally={...special.pos};special.center={...pos};window.reinfFixture={special,enemy}
    }
   }
   advance.call(this,dt);if(window.reinfFixture?.special.visualOverride)window.reinfPhases.add(window.reinfFixture.special.visualOverride.name)
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page);await page.getByRole('button',{name:'开始战斗',exact:true}).click();const confirm=page.getByRole('button',{name:'确认出击',exact:true});if(await confirm.count())await confirm.click()
 const canvas=await page.locator('.viewport canvas').boundingBox(),point={x:canvas.x+(550+512/3)/(768*16/9)*canvas.width,y:canvas.y+(768-315)/768*canvas.height}
 await page.waitForFunction(()=>!document.querySelector('[data-power=reinforcements]').disabled);await page.keyboard.press('1');await page.waitForFunction(()=>document.querySelector('[data-power=reinforcements]').getAttribute('aria-pressed')==='true');await page.mouse.click(point.x,point.y)
 await page.waitForFunction(()=>window.reinfFixture?.special.visualOverride?.name==='in');await page.screenshot({path:'analysis/web-reinforcement-special-in.png'})
 assert.equal(await page.evaluate(()=>window.reinfGame.barracks.soldiers.filter(s=>s.name.startsWith('soldier_reinforcement')).length),3)
 await page.waitForFunction(()=>window.reinfFixture?.enemy.hp<5000&&window.reinfFixture.special.visualOverride?.name==='attack_loop');await page.screenshot({path:'analysis/web-reinforcement-special-attack.png'})
 await page.waitForFunction(()=>window.reinfWorld?.reinforcementSpecialRenderer?.sprites.size>0)
 const paint=await page.evaluate(()=>{
  const g=window.reinfGame,w=window.reinfWorld
  return [...g.reinforcementSpecial.models].filter(m=>m.kind==='armor').map(m=>{
   const id=g.entities.entity(m).id,art=w.reinforcementSpecialRenderer.sprites.get(`${id}:1`);if(!art)throw Error('Missing registered armor sprite')
   let key,z,opacity;art.root.traverse(o=>{if(o.isMesh){key=o.userData.nativePaint?.key;z=o.userData.nativePaint?.z;opacity=o.material.opacity}})
   return {key,wanted:`${id}:sprite:1`,z,opacity,alpha:m.alpha/255}
  })
 });assert(paint.length>=1);assert(paint.every(p=>p.key===p.wanted&&p.z===1400&&p.opacity===p.alpha))
 assert.equal(await page.evaluate(()=>window.reinfFixture.special.template.unit.damage_factor),2.475)
 assert.equal(await page.evaluate(()=>window.reinfFixture.special.template.render.sprites[0].scale.x),.9)
 assert.equal(await page.evaluate(()=>window.reinfGame.powers.cooldowns.reinforcements),12)
 await page.waitForFunction(()=>window.reinfPhases?.has('attack_out'))
 const frames=await page.evaluate(()=>[...window.reinfFrames]);for(const name of ['in','attack_in','attack_loop','attack_out']){assert(await page.evaluate(name=>window.reinfPhases.has(name),name));const a=animations['reinforcements_lvl3_special_unit_'+name];assert(frames.some(frame=>frame.startsWith(a.prefix+'_')&&Number(frame.split('_').at(-1))>=a.from&&Number(frame.split('_').at(-1))<=a.to),name)}
 assert(frames.includes('reinforcements_lvl3_buff_decal'));assert(await page.evaluate(()=>window.reinfSounds.has('MeleeSword')))
 await page.waitForFunction(()=>window.reinfFixture?.special.fadeOutAt!==undefined);await page.waitForFunction(()=>[...window.reinfGame.reinforcementSpecial.models].every(m=>m.kind!=='armor'&&m.kind!=='damage'))
 assert.equal(await page.evaluate(()=>window.reinfFixture.special.template.unit.damage_factor),2.25);assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: ordinary saved-rank6 reinforcement cast spawns three units; original special entrance/three-part attack/buff ring, .9 scale, 12s cooldown, actual melee hits and sound triggers; timed departure and aura-buff cleanup; no page/asset errors')
}catch(error){for(const page of browser.contexts().flatMap(c=>c.pages())){console.error((await page.locator('body').innerText()).slice(-4000));await page.screenshot({path:'analysis/reinforcement-special-browser-failure.png'})}throw error}finally{await browser.close()}
