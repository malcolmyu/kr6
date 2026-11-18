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
  window.trapFrames=[];window.trapSounds=[];window.trapAnimations=[]
  SpriteAtlas.prototype.create=function(...args){const art=create.apply(this,args),set=art.setFrame;art.setFrame=function(name,...rest){if(name.includes('projectiles_trap_')||name.startsWith('stun_'))window.trapFrames.push(name);return set.call(this,name,...rest)};return art}
  AudioManager.prototype.trigger=function(name,...args){window.trapSounds.push(name);return trigger.call(this,name,...args)}
  ExoSprite.prototype.animate=function(name,...args){if(name==='traps')window.trapAnimations.push({name,fps:args[2]});return animate.call(this,name,...args)}
  GameSession.prototype.advance=function(dt){
   if(!this.trapFixture&&this.levelData.data.entities_list.some(e=>e.template==='tower_wizard_lvl1_stage_02')){
    this.trapFixture=true;this.towers.sites.forEach(s=>s.attackDisabled=true);this.heroes.team.forEach(h=>h.scriptLocked=true)
    const site=this.towers.sites.find(s=>s.id==='8');site.attackDisabled=false;const far={x:-100,y:-100};this.spawnCinematicEnemy('enemy_bandit',1,far);const enemy=this.enemies.at(-1);enemy.hp=5000;enemy.template.health.hp_max=5000;enemy.template.motion.max_speed=60;enemy.skillLocked=true
    const place=pos=>{enemy.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);enemy.hp=5000;enemy.skillLocked=true};place(far)
    const damage=[],shots=[],onDamage=this.combat.nativeTraps.onDamage,shoot=this.combat.catapultTowers.onShoot
    this.combat.nativeTraps.onDamage=(e,value,type)=>{damage.push({id:e.id,value,time:this.time});onDamage(e,value,type)};this.combat.catapultTowers.onShoot=(...args)=>{shots.push({name:args[1],level:args[6],at:args[5]});shoot(...args)}
    window.trapFixture={game:this,site,enemy,damage,shots,place,far,movement:[],measure:false}
   }
   const f=this.trapFixture&&window.trapFixture,x=f?.enemy.path.position.x,at=this.time,stunned=f?.enemy.template.unit.is_stunned
   advance.call(this,dt)
   if(f){
    if(f.measure&&this.time>at){f.movement.push({dt:this.time-at,dx:f.enemy.path.position.x-x,stunned:!!stunned});if(f.movement.length>=12){f.measure=false;f.enemy.skillLocked=true}}
    const {site,enemy,damage,shots}=f,stun=this.combat.nativeTraps.stuns.stuns.find(s=>s.enemy===enemy);window.trapObservation={time:this.time,wave:this.waves.wave,power:site.powerLevels?.skill_c??0,traps:[...this.combat.nativeTraps.traps].map(t=>({...t})),stun:stun&&{level:stun.level,duration:stun.duration,at:stun.ts,pending:stun.queued},damage:[...damage],shots:[...shots],hp:enemy.hp,stunned:!!enemy.template.unit.is_stunned}
   }
  }
 })
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 const canvas=await page.locator('.viewport canvas').boundingBox(),point={x:canvas.x+(713+512/3)/(768*16/9)*canvas.width,y:canvas.y+(768-278)/768*canvas.height}
 await page.mouse.click(point.x,point.y);await confirmTowerAction(page,'投石塔 · 110')
 for(let level=2;level<=4;level++){await page.mouse.click(point.x,point.y);await confirmTowerAction(page,`升级 · ${templates[`tower_catapult_lvl${level}`].tower.price}`)}
 const before=await page.evaluate(()=>window.trapFixture.game.gold)
 for(let rank=1;rank<=3;rank++){
  if(!await page.locator('.tower-menu').count())await page.mouse.click(point.x,point.y);await confirmTowerAction(page,'防卫区域 · 100')
  if(rank===1){
   await page.getByRole('button',{name:'取消',exact:true}).click();const at=await page.evaluate(()=>window.trapObservation.time);await page.waitForFunction(at=>window.trapObservation.time>at+.3,at);assert.equal(await page.evaluate(()=>window.trapObservation.traps.length),0,'native pre-wave gate')
   const wave=await page.getByRole('button',{name:'开始战斗',exact:true}).boundingBox();await page.mouse.click(wave.x+wave.width/2,wave.y+wave.height/2)
  }else await page.getByRole('button',{name:'取消',exact:true}).click()
  await page.evaluate(()=>{window.trapFixture.place(window.trapFixture.far);window.trapFixture.site.attackDisabled=false})
  await page.waitForFunction(rank=>window.trapObservation.traps.some(t=>t.level===rank&&t.name==='ready'),rank)
  await page.evaluate(rank=>{const f=window.trapFixture,t=[...f.game.combat.nativeTraps.traps].find(t=>t.level===rank&&t.name==='ready');f.site.attackDisabled=true;f.place(t.pos)},rank)
  await page.waitForFunction(rank=>window.trapObservation.stun?.level===rank,rank)
  const obs=await page.evaluate(()=>window.trapObservation),hit=obs.damage.at(-1);assert(hit.value>=[20,32,48][rank-1]&&hit.value<=[30,48,72][rank-1]);assert.equal(obs.hp,5000-hit.value);assert.equal(obs.stun.duration,rank);assert(obs.stunned)
  if(rank===3){await page.screenshot({path:'analysis/web-catapult-traps-rank3.png'});await page.evaluate(()=>{const f=window.trapFixture;f.measure=true;f.enemy.skillLocked=false});await page.waitForFunction(()=>window.trapFixture.movement.length>=12);const moves=await page.evaluate(()=>window.trapFixture.movement);assert(moves.every(m=>m.stunned&&m.dx===0),'actual stunned enemy path stops')}
  await page.waitForFunction(()=>!window.trapObservation.stunned)
  console.log('Verified native trap rank',rank)
 }
 assert.equal(await page.evaluate(()=>window.trapFixture.game.gold),before-300)
 await page.mouse.click(point.x,point.y);await page.getByRole('button',{name:'防卫区域 · 已满级',exact:true}).click();assert.match(await page.locator('.tower-tooltip').innerText(),/48-72.*眩晕 3 秒/s);await page.screenshot({path:'analysis/web-catapult-traps-menu.png'});await page.getByRole('button',{name:'取消',exact:true}).click()
 await page.evaluate(()=>{const f=window.trapFixture;f.place(f.far);f.site.attackDisabled=false})
 await page.waitForFunction(()=>window.trapObservation.traps.some(t=>t.level===3&&t.name==='ready'))
 const orphan=await page.evaluate(()=>{const f=window.trapFixture;f.site.attackDisabled=true;return {...[...f.game.combat.nativeTraps.traps].find(t=>t.name==='ready').pos}})
 await page.mouse.click(point.x,point.y);const sell=page.getByRole('button',{name:/^出售 ·/});await sell.click();await sell.click();await page.waitForFunction(()=>window.trapFixture.site.tower===undefined)
 assert(await page.evaluate(()=>window.trapObservation.traps.length>0),'untriggered native traps survive source sale');const count=await page.evaluate(()=>window.trapObservation.damage.length);await page.evaluate(pos=>window.trapFixture.place(pos),orphan);await page.waitForFunction(count=>window.trapObservation.damage.length>count&&window.trapObservation.stunned,count);await page.waitForFunction(()=>window.trapObservation.traps.length===0&&!window.trapObservation.stunned)
 const frames=await page.evaluate(()=>window.trapFrames),sounds=await page.evaluate(()=>window.trapSounds),animations=await page.evaluate(()=>window.trapAnimations)
 for(const suffix of ['0002','0020','0021'])assert(frames.includes('tower_catapult_projectiles_trap_'+suffix),suffix);assert(frames.some(f=>f.startsWith('stun_small_')));assert(animations.some(a=>a.name==='traps'&&a.fps===40))
 for(const name of ['TowerRoyalCatapultSkillCTaunt','TowerRoyalCatapultBasicAttackFire','TowerRoyalCatapultSecureTheAreaCast','TowerRoyalCatapultSecureTheAreaTrigger'])assert(sounds.includes(name),name)
 assert(!sounds.includes('TowerRoyalCatapultTarredZoneImpact'),'inherited C hit sound is not played without a land hit FX');assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser C: native build/Lv4/three purchases, wave gate, original placement/throw/set/ready/activate/stun art, rank damage and1/2/3-second stuns, actual stopped path, paid gold/max tooltip, original audio requests and source-sale trap trigger/cleanup; no page/asset errors')
}finally{await browser.close()}
