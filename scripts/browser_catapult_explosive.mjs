import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const templates=JSON.parse(readFileSync('public/data/entities.json')),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),find=name=>resources.find(r=>r.name.includes('/src/game/'+name+'.ts')).name,{GameSession}=await import(find('GameSession')),{PathFollower}=await import(find('PathFollower')),{SpriteAtlas}=await import(find('SpriteAtlas')),{AudioManager}=await import(find('AudioManager')),{ExoSprite}=await import(find('ExoSprite')),advance=GameSession.prototype.advance,create=SpriteAtlas.prototype.create,trigger=AudioManager.prototype.trigger,animate=ExoSprite.prototype.animate
  window.explosiveFrames=[];window.explosiveSounds=[];window.explosiveAnimations=[]
  SpriteAtlas.prototype.create=function(...args){const art=create.apply(this,args),set=art.setFrame;art.setFrame=function(name,...rest){if(name.includes('explosive_fx'))window.explosiveFrames.push(name);return set.call(this,name,...rest)};return art}
  AudioManager.prototype.trigger=function(name,...args){window.explosiveSounds.push(name);return trigger.call(this,name,...args)}
  ExoSprite.prototype.animate=function(name,...args){if(name.includes('explosive')||name==='ball_reload_2')window.explosiveAnimations.push(name);return animate.call(this,name,...args)}
  GameSession.prototype.advance=function(dt){
   if(!this.explosiveFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    this.explosiveFixture=true;this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
    const site=this.towers.sites.find(s=>s.id==='8'),pos={x:site.pos.x+110,y:site.pos.y+100};site.attackDisabled=false
    this.spawnCinematicEnemy('enemy_bandit',1,pos);const enemy=this.enemies.at(-1);enemy.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);enemy.hp=5000;enemy.template.health.hp_max=5000;enemy.template.motion.max_speed=0
    const damages=[],shots=[],onDamage=this.combat.nativeBombs.onDamage,shoot=this.combat.catapultTowers.onShoot
    this.combat.nativeBombs.onDamage=(e,value,type)=>{damages.push({id:e.id,value,time:this.time,hp:e.hp});onDamage(e,value,type)}
    this.combat.catapultTowers.onShoot=(...args)=>{shots.push({name:args[1],level:args[6],at:args[5]});shoot(...args)}
    window.explosiveFixture={game:this,site,enemy,damages,shots}
   }
   advance.call(this,dt)
   if(this.explosiveFixture){const {site,enemy,shots,damages}=window.explosiveFixture,state=this.combat.catapultTowers.states.get('8');window.explosiveObservation={time:this.time,power:site.powerLevels?.skill_b??0,parts:state?.parts,bombs:[...this.combat.nativeBombs.bombs].map(b=>({...b})),shots:[...shots],damages:[...damages],hp:enemy.hp,gold:this.gold}}
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 const canvas=await page.locator('.viewport canvas').boundingBox(),point={x:canvas.x+(713+512/3)/(768*16/9)*canvas.width,y:canvas.y+(768-278)/768*canvas.height}
 await page.mouse.click(point.x,point.y);await confirmTowerAction(page,'投石塔 · 110')
 for(let level=2;level<=4;level++){await page.mouse.click(point.x,point.y);await confirmTowerAction(page,`升级 · ${templates[`tower_catapult_lvl${level}`].tower.price}`)}
 await page.waitForFunction(()=>window.explosiveObservation?.parts)
 const before=await page.evaluate(()=>window.explosiveFixture.game.gold)
 for(let rank=1;rank<=3;rank++){
  const price=[150,200,250][rank-1];if(!await page.locator('.tower-menu').count())await page.mouse.click(point.x,point.y);await confirmTowerAction(page,`爆裂投石 · ${price}`)
  await page.waitForFunction(rank=>window.explosiveObservation?.power===rank,rank)
  await page.waitForFunction(rank=>window.explosiveObservation?.shots.some(s=>s.name==='bullet_catapult_skill_b'&&s.level===rank),rank)
  await page.waitForFunction(rank=>window.explosiveObservation?.damages.some(d=>d.value===[30,68,102][rank-1]),rank)
  console.log('Verified native explosive rank',rank)
 }
 assert.equal(await page.evaluate(()=>window.explosiveObservation.gold),before-600)
 await page.waitForFunction(()=>window.explosiveObservation?.bombs.some(b=>b.name==='activate'&&!b.hit))
 await page.screenshot({path:'analysis/web-catapult-explosive-rank3.png'})
 if(!await page.locator('.tower-menu').count())await page.mouse.click(point.x,point.y);await page.getByRole('button',{name:'爆裂投石 · 已满级',exact:true}).click();assert.match(await page.locator('.tower-tooltip').innerText(),/58-102/)
 await page.screenshot({path:'analysis/web-catapult-explosive-menu.png'});await page.getByRole('button',{name:'取消',exact:true}).click()
 await page.waitForFunction(()=>window.explosiveObservation?.bombs.some(b=>b.name==='fall'))
 const hits=await page.evaluate(()=>window.explosiveObservation.damages.length)
 await page.mouse.click(point.x,point.y);const sell=page.getByRole('button',{name:/^出售 ·/});await sell.click();await sell.click()
 await page.waitForFunction(()=>window.explosiveFixture.site.tower===undefined)
 assert.equal(await page.evaluate(()=>window.explosiveFixture.damages.length),hits,'sale occurs before the pending explosion damages')
 await page.waitForFunction(hits=>window.explosiveObservation.damages.length>hits,hits)
 await page.waitForFunction(()=>window.explosiveObservation.bombs.length===0)
 assert(await page.evaluate(()=>window.explosiveObservation.hp<5000))
 const frames=await page.evaluate(()=>window.explosiveFrames),animations=await page.evaluate(()=>window.explosiveAnimations),sounds=await page.evaluate(()=>window.explosiveSounds)
 assert(frames.some(f=>/^tower_catapult_projectiles_pojectile_lvl4_explosive_fx_000[1-8]$/.test(f)));assert(frames.includes('tower_catapult_projectiles_pojectile_lvl4_explosive_fx_0010'));assert(animations.includes('reload_explosive'));assert(animations.includes('ball_reload_2'));assert(animations.includes('attack_2_explosive'))
 for(const name of ['TowerRoyalCatapultSkillBTaunt','TowerRoyalCatapultBasicAttackFire','TowerRoyalCatapultBasicAttackImpact','TowerRoyalCatapultPowerballExplosion'])assert(sounds.includes(name),name)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser catapult B: ordinary build/Lv4 upgrade/three purchases, actual rank30/68/102 payload hits, native explosive/loader/balls art, fall/activation animation, original taunt/fire/impact/explosion audio, max tooltip, paid gold and source-sale survival/cleanup; no page/asset errors')
}finally{await browser.close()}
