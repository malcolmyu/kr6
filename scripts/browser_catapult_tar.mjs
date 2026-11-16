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
  window.tarFrames=[];window.tarSounds=[];window.tarAnimations=[]
  SpriteAtlas.prototype.create=function(...args){const art=create.apply(this,args),set=art.setFrame;art.setFrame=function(name,...rest){if(name.includes('tarred_zone'))window.tarFrames.push(name);return set.call(this,name,...rest)};return art}
  AudioManager.prototype.trigger=function(name,...args){window.tarSounds.push(name);return trigger.call(this,name,...args)}
  ExoSprite.prototype.animate=function(name,...args){if(name.includes('tarred_zone'))window.tarAnimations.push(name);return animate.call(this,name,...args)}
  GameSession.prototype.advance=function(dt){
   if(!this.tarFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    this.tarFixture=true;this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
    const site=this.towers.sites.find(s=>s.id==='8'),pos={x:site.pos.x+110,y:site.pos.y+100};site.attackDisabled=false
    this.spawnCinematicEnemy('enemy_bandit',1,pos);const enemy=this.enemies.at(-1);enemy.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);enemy.hp=5000;enemy.template.health.hp_max=5000;enemy.template.motion.max_speed=60;enemy.skillLocked=true
    const shots=[],shoot=this.combat.catapultTowers.onShoot;this.combat.catapultTowers.onShoot=(...args)=>{shots.push({name:args[1],level:args[6],at:args[5]});shoot(...args)}
    window.tarFixture={game:this,site,enemy,shots,moving:false,movements:[]}
   }
   const f=this.tarFixture&&window.tarFixture,x=f?.enemy.path.position.x,at=this.time
   advance.call(this,dt)
   if(f){
    if(f.moving&&this.time>at){f.movements.push({dt:this.time-at,dx:f.enemy.path.position.x-x,speed:f.enemy.template.motion.max_speed});if(f.movements.length>=12){f.moving=false;f.enemy.skillLocked=true}}
    const {site,enemy,shots}=f,state=this.combat.catapultTowers.states.get('8');window.tarObservation={time:this.time,power:site.powerLevels?.skill_a??0,parts:state?.parts,areas:this.combat.catapultTar.areas.map(a=>({...a})),slowLevel:this.combat.catapultTar.slows.get(enemy.id)?.level,speed:enemy.template.motion.max_speed,shots:[...shots],hp:enemy.hp,gold:this.gold}
   }
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 const canvas=await page.locator('.viewport canvas').boundingBox(),point={x:canvas.x+(713+512/3)/(768*16/9)*canvas.width,y:canvas.y+(768-278)/768*canvas.height}
 await page.mouse.click(point.x,point.y);await confirmTowerAction(page,'投石塔 · 110')
 for(let level=2;level<=4;level++){await page.mouse.click(point.x,point.y);await confirmTowerAction(page,`升级 · ${templates[`tower_catapult_lvl${level}`].tower.price}`)}
 const before=await page.evaluate(()=>window.tarFixture.game.gold)
 for(let rank=1;rank<=3;rank++){
  if(!await page.locator('.tower-menu').count())await page.mouse.click(point.x,point.y);await confirmTowerAction(page,'焦油覆地 · 100')
  await page.waitForFunction(rank=>window.tarObservation?.power===rank,rank)
  await page.waitForFunction(rank=>window.tarObservation?.shots.some(s=>s.name===`bullet_catapult_skill_a_lvl${rank}`&&s.level===rank),rank)
  await page.waitForFunction(rank=>window.tarObservation?.areas.some(a=>a.level===rank)&&window.tarObservation.slowLevel===rank,rank)
  assert(Math.abs(await page.evaluate(()=>window.tarObservation.speed)-[36,30,24][rank-1])<1e-9)
  console.log('Verified native tar rank',rank)
 }
 assert.equal(await page.evaluate(()=>window.tarObservation.gold),before-300)
 await page.waitForFunction(()=>window.tarObservation.areas.some(a=>a.level===3&&window.tarObservation.time-a.at>1.5))
 await page.screenshot({path:'analysis/web-catapult-tar-rank3.png'})
 if(!await page.locator('.tower-menu').count())await page.mouse.click(point.x,point.y);await page.getByRole('button',{name:'焦油覆地 · 已满级',exact:true}).click();assert.match(await page.locator('.tower-tooltip').innerText(),/减速 60%.*10 秒/s)
 await page.screenshot({path:'analysis/web-catapult-tar-menu.png'});await page.getByRole('button',{name:'取消',exact:true}).click()
 await page.evaluate(()=>{window.tarFixture.moving=true;window.tarFixture.enemy.skillLocked=false})
 await page.waitForFunction(()=>window.tarFixture.movements.length>=12)
 const moves=await page.evaluate(()=>window.tarFixture.movements);for(const m of moves){assert(Math.abs(m.speed-24)<1e-9);assert(Math.abs(m.dx-m.dt*24)<1e-8,'actual enemy path movement uses slowed speed')}
 await page.mouse.click(point.x,point.y);const sell=page.getByRole('button',{name:/^出售 ·/});await sell.click();await sell.click()
 await page.waitForFunction(()=>window.tarFixture.site.tower===undefined)
 assert(await page.evaluate(()=>window.tarObservation.areas.length>0),'native tar persists after source sale')
 await page.waitForFunction(()=>window.tarObservation.areas.length===0&&window.tarObservation.speed===60)
 assert(await page.evaluate(()=>window.tarObservation.hp<5000))
 const frames=await page.evaluate(()=>window.tarFrames),animations=await page.evaluate(()=>window.tarAnimations),sounds=await page.evaluate(()=>window.tarSounds)
 assert(frames.some(f=>f.startsWith('tower_catapult_projectiles_tarred_zone_hit_fx_')));assert(frames.includes('tower_catapult_projectiles_tarred_zone_decal_0045'));assert(animations.includes('reload_tarred_zone'));assert(animations.includes('attack_2_tarred_zone'))
 for(const name of ['TowerRoyalCatapultSkillATaunt','TowerRoyalCatapultBasicAttackFire','TowerRoyalCatapultTarredZoneImpact'])assert(sounds.includes(name),name)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser catapult A: ordinary build/Lv4 upgrade/three purchases, actual36/30/24 speeds, real slowed path movement, native tar/loader/projectile/decal art, original taunt/fire/impact audio, max tooltip, paid gold and source-sale survival/fade/expiry; no page/asset errors')
}finally{await browser.close()}
