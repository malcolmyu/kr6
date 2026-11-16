import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const sounds=JSON.parse(readFileSync('public/data/audio.json')).sounds,browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});let page
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(45000);const errors=[],missing=[],audio=new Set()
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());if(r.ok()&&r.url().includes('/audio/'))audio.add(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),get=async name=>import(resources.find(r=>r.name.includes('/src/game/'+name+'.ts')).name),{GameSession}=await get('GameSession'),{WorldRenderer}=await get('WorldRenderer'),advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderTowers
  WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session?.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))window.markWorld=this}
  GameSession.prototype.advance=function(dt){advance.call(this,dt);if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return;window.markSession=this;for(const h of this.heroes.team)h.scriptLocked=true
   if(!window.markSite){window.markSite=this.towers.sites.find(s=>!s.tower&&!s.building&&s.pos.x>250&&s.pos.x<850&&s.pos.y>180&&s.pos.y<500);window.markCasts=[];const cast=this.combat.archerMarkCaster.onEagle;this.combat.archerMarkCaster.onEagle=(...args)=>{window.markCasts.push({time:this.time});cast(...args)}}
   for(const site of this.towers.sites)site.attackDisabled=site!==window.markSite
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.markSite&&window.markWorld)
 async function clickSite(){const box=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(()=>window.markSite.pos);await page.mouse.click(box.x+(pos.x+512/3)/(768*16/9)*box.width,box.y+(768-pos.y)/768*box.height)}
 await clickSite();await confirmTowerAction(page,'弓箭塔 · 70');await page.waitForFunction(()=>window.markSite.tower)
 for(let i=0;i<3;i++){await clickSite();await confirmTowerAction(page,/^升级 ·/)}
 await page.evaluate(async()=>{const resources=performance.getEntriesByType('resource'),{PathFollower}=await import(resources.find(r=>r.name.includes('/src/game/PathFollower.ts')).name),g=window.markSession,pos={x:window.markSite.pos.x+100,y:window.markSite.pos.y+20};g.spawnCinematicEnemy('enemy_bandit',1,pos);const e=g.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.path=new PathFollower([pos,{x:pos.x+500,y:pos.y}]);e.frozen=true;e.skillLocked=true;e.template.unit.mod_offset={x:7,y:13};window.markEnemy=e})
 for(let level=1;level<=3;level++){
  if(!await page.getByRole('button',{name:'揭示弱点 · 200',exact:true}).count())await clickSite();const gold=await page.evaluate(()=>window.markSession.gold);await confirmTowerAction(page,'揭示弱点 · 200');assert.equal(await page.evaluate(()=>window.markSession.gold),gold-200)
  if(level===3)assert.equal(await page.getByRole('button',{name:'揭示弱点 · 已满级',exact:true}).count(),1)
  await page.waitForFunction(l=>window.markSession.archerMark.marks.some(m=>m.level===l&&m.inserted&&window.markWorld.archerMarkRenderer.sprites.has(m)),level)
  const state=await page.evaluate(l=>{const g=window.markSession,m=g.archerMark.marks.find(m=>m.level===l),e=g.entities.entity(m),art=window.markWorld.archerMarkRenderer.sprites.get(m),keys=[];art.root.traverse(o=>{if(o.isMesh)keys.push(o.userData.nativePaint?.key)});return{factor:window.markEnemy.template.health.damage_factor,id:e.id,registered:!!g.entities.registry.entities.get(e.id),keys,pos:m.pos,offset:m.offset,draw:{x:art.root.position.x,y:art.root.position.y}}},level)
  assert.equal(state.factor,[1.3,1.5,1.75][level-1]);assert(state.registered);assert(state.keys.length>0);assert(state.keys.every(k=>k===`${state.id}:sprite:1`));assert.deepEqual(state.draw,{x:state.pos.x+state.offset.x,y:state.pos.y+state.offset.y})
  await page.screenshot({path:`analysis/web-archers-mark-${level}.png`})
  if(level===3){if(!await page.getByRole('button',{name:/^出售 ·/}).count())await clickSite();await confirmTowerAction(page,/^出售 ·/);await page.waitForFunction(()=>!window.markSite.tower);assert.equal(await page.evaluate(()=>window.markEnemy.template.health.damage_factor),1.75)}
  await page.waitForFunction(l=>window.markSession.archerMark.marks.some(m=>m.level===l&&m.phase==='fade'),level)
  assert.equal(await page.evaluate(()=>window.markEnemy.template.health.damage_factor),[1.3,1.5,1.75][level-1]);await page.screenshot({path:`analysis/web-archers-mark-fade-${level}.png`})
  await page.waitForFunction(()=>window.markSession.archerMark.marks.length===0);assert.equal(await page.evaluate(()=>window.markEnemy.template.health.damage_factor),1)
 }
 assert(await page.evaluate(()=>window.markEnemy.hp<10000));await page.waitForFunction(()=>window.markWorld.archerMarkRenderer.sprites.size===0)
 assert([...audio].some(url=>sounds.TowerArcherGarrisonMarkOfTheEagleCast.files.some(file=>url.endsWith(file))));assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Chrome archers mark: three real200-gold purchases/cap, native eagle cast audio, registered EXO order/offset, level multipliers retained through fade and after source sale, removal restores factor and cleans rendering. Quiet waves/durable target, not ordinary battle/video acceptance.')
}catch(e){if(page){await page.screenshot({path:'analysis/archers-mark-browser-failure.png'});console.error(await page.evaluate(()=>({time:window.markSession?.time,casts:window.markCasts,site:window.markSite,marks:window.markSession?.archerMark.marks.map(m=>({level:m.level,phase:m.phase,at:m.at,spriteAt:m.spriteAt})),error:document.querySelector('[role=alert]')?.textContent})))}throw e}finally{await browser.close()}
