import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=name=>performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/'+name+'.ts')).name
  const {GameSession}=await import(resource('GameSession')),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){advance.call(this,dt);if(this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){window.armorGame=this;window.armorSite=this.towers.sites.find(s=>s.id==='7')}}
  const {WorldRenderer}=await import(resource('WorldRenderer')),render=WorldRenderer.prototype.renderTowers
  WorldRenderer.prototype.renderTowers=function(){render.call(this);if(this.session===window.armorGame)window.armorWorld=this}
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.armorSite)
 async function clickSite(){const box=await page.locator('.viewport canvas').boundingBox(),p=await page.evaluate(()=>window.armorSite.pos);await page.mouse.click(box.x+(p.x+512/3)/(768*16/9)*box.width,box.y+(768-p.y)/768*box.height)}
 await clickSite();await confirmTowerAction(page,'兵营 · 70');await page.waitForFunction(()=>window.armorSite.tower)
 for(let i=0;i<3;i++){await clickSite();await confirmTowerAction(page,/^升级 ·/)}
 await page.waitForFunction(()=>window.armorGame.barracks.soldiers.filter(s=>s.siteId==='7'&&s.name==='soldier_knights_lvl4'&&s.hp>0&&!s.deploying).length===3)
 await page.evaluate(()=>{window.armorHome={...window.armorGame.heroes.gerald.pos}})
 async function armor(value){await page.waitForFunction(v=>{const g=window.armorGame,ss=g.barracks.soldiers.filter(s=>s.siteId==='7');return ss.length===3&&ss.every(s=>Math.abs(s.template.health.armor-v)<1e-12)},value)}
 await armor(.4);await clickSite();await confirmTowerAction(page,'守护鼓舞 · 120');await armor(.45)
 await page.waitForFunction(()=>window.armorGame.knightArmor.models.size===3)
 // Route through the same world selection and normal rally API as a portrait click.
 async function moveHero(home=false){assert(await page.evaluate(home=>{const g=window.armorGame,w=window.armorWorld;w.selectHero(g.heroes.gerald.id);const accepted=g.heroes.moveSelected(home?window.armorHome:window.armorSite.rally);if(accepted)w.heroSelected=false;return accepted},home))}
 await moveHero();await armor(.5);await page.waitForFunction(()=>[...window.armorGame.knightArmor.models].every(m=>m.alpha===255))
 await clickSite();await confirmTowerAction(page,'守护鼓舞 · 120');await armor(.6)
 await confirmTowerAction(page,'守护鼓舞 · 120');await armor(.7)
 assert.equal(await page.getByRole('button',{name:'守护鼓舞 · 已满级',exact:true}).count(),1)
 const paint=await page.evaluate(()=>{const g=window.armorGame,w=window.armorWorld;return [...g.knightArmor.models].map(m=>{const id=g.entities.entity(m).id;return [1,2].map(i=>{const art=w.knightArmorRenderer.sprites.get(`${id}:${i}`);if(!art)throw Error('missing armor layer');let key;art.root.traverse(o=>{if(o.isMesh)key=o.userData.nativePaint?.key});return {key,wanted:`${id}:sprite:${i}`}})}).flat()});assert.equal(paint.length,6);assert(paint.every(p=>p.key===p.wanted))
 await page.screenshot({path:'analysis/web-knight-armor-active.png'})
 await page.getByRole('button',{name:'取消',exact:true}).click();await moveHero(true);await armor(.55);await page.waitForFunction(()=>[...window.armorGame.knightArmor.models].every(m=>m.alpha===0))
 await clickSite();await confirmTowerAction(page,/^出售 ·/);await page.waitForFunction(()=>window.armorGame.knightArmor.models.size===0&&window.armorWorld.knightArmorRenderer.sprites.size===0)
 assert.equal(await page.evaluate(()=>[...window.armorGame.entities.registry.entities.values()].filter(e=>e.template==='soldier_knights_lvl4').length),0)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: normal knight build and three A purchases, permanent/proximity armor, hero movement, original six atlas layers/native painter keys, fade in/out and sale cleanup; quiet controlled wave, not ordinary battle/video acceptance')
}finally{await browser.close()}
