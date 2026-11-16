import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame,confirmTowerAction} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3,iron:true},2:{campaign:3}}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(resource),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(!this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow'))return
   window.culvTowerSession=this
   if(!this.culvTowerSite){const p=this.levelData.paths.paths[2][0][99];this.culvTowerSite=this.towers.sites.filter(s=>!s.tower&&!s.building).sort((a,b)=>Math.hypot(a.pos.x-p.x,a.pos.y-p.y)-Math.hypot(b.pos.x-p.x,b.pos.y-p.y))[0];for(const h of this.heroes.team)h.scriptLocked=true}
   const site=this.culvTowerSite
   if(site.tower?.startsWith('tower_culverine_')&&site.tower!==this.culvTowerKey){
    this.culvTowerKey=site.tower;this.culvTowerCaptured=false;this.enemies.length=0
    this.spawn({enemy:'enemy_blackguard',pi:3,spi:1},this.time);const e=this.enemies.at(-1);e.path.ni=100;Object.assign(e.path.position,this.levelData.paths.paths[2][0][99]);e.frozen=true;this.culvTowerTarget=e;this.culvTowerBefore=e.hp
   }
   if(this.culvTowerTarget){const ray=this.combat.culverineRays.rays.find(r=>r.name===`bullet_culverine_lvl${site.tower.match(/lvl(\d+)/)[1]}`&&r.born!==undefined&&!r.hidden&&!r.removed),state=this.combat.culverineTowers.states.get(site.id)
    window.culvTowerObservation={key:site.tower,visible:!!ray,damage:this.culvTowerBefore-this.culvTowerTarget.hp,parts:state?.parts,available:this.towers.available}
    if(ray&&!this.culvTowerCaptured){this.culvTowerCaptured=true;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.culvTowerSession?.culvTowerSite)
 const canvas=await page.locator('.viewport canvas').boundingBox(),pos=await page.evaluate(()=>window.culvTowerSession.culvTowerSite.pos),click=()=>page.mouse.click(canvas.x+(pos.x+512/3)/(768*16/9)*canvas.width,canvas.y+(768-pos.y)/768*canvas.height)
 await click();await page.waitForTimeout(250);assert.equal(await page.getByRole('button',{name:'未装备防御塔',exact:true}).count(),0);await page.screenshot({path:'analysis/web-culverine-build-menu.png'});await confirmTowerAction(page,'矮人炮塔 · 130')
 for(let level=1;level<=4;level++){
  if(level>1){await page.evaluate(()=>{window.culvTowerSession.paused=false});await click();await confirmTowerAction(page,/^升级 ·/)}
  await page.waitForFunction(l=>window.culvTowerObservation?.key===`tower_culverine_lvl${l}`&&window.culvTowerObservation.visible,level)
  const o=await page.evaluate(()=>window.culvTowerObservation);assert(o.damage>0);assert.equal(o.parts.length,5);await page.screenshot({path:`analysis/web-culverine-tower-lv${level}.png`})
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Culverine: earned seven-star loadout, native fifth build slot and ordinary build/upgrade commands, automatic target/shoot at all four levels, original multipart EXOs/rays/actual damage; no JS/asset errors. Enemy movement is frozen for captures.')
}finally{await browser.close()}
