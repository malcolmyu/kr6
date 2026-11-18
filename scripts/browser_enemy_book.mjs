import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const url=process.argv[2]??'http://127.0.0.1:5173/',browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{if(!localStorage.getItem('kingdom-rush-6.progress.v1'))localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3},3:{campaign:3}},onboarding:{stage1:true,stage2:true,comic2:true}}))})
 let mapRequests=0;await page.route('**/data/map.json',r=>++mapRequests===1?r.fulfill({status:503,body:'temporary CDN error'}):r.continue())
 await page.goto(url);await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.locator('[data-slot-state="open"]').waitFor();await page.getByRole('button',{name:'选择存档 1',exact:true}).click();await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'});await page.getByRole('button',{name:'怪物图鉴',exact:true}).click();await page.getByRole('dialog',{name:'怪物图鉴',exact:true}).waitFor();assert.equal(mapRequests,2)
 await page.getByRole('button',{name:'暗影弓手',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.enemy-book')?.getAttribute('data-enemy')==='enemy_shadow_archer');assert((await page.locator('.enemy-book').innerText()).includes('暗影弓手'))
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'/tmp/kr6-enemy-book.png'})
 await page.getByRole('button',{name:'图鉴第3页',exact:true}).click();assert.equal(await page.locator('.enemy-book').getAttribute('data-page'),'3');assert.equal(await page.locator('.enemy-book button[disabled]').count(),16)
 await page.keyboard.press('Escape');await page.locator('.enemy-book').waitFor({state:'detached'});assert.deepEqual(errors,[])
 // Permanent request failure stays recoverable without deleting/reselecting a save.
 await page.unroute('**/data/map.json');let fail=true;await page.route('**/data/global-room.json',r=>fail?r.fulfill({status:404,body:'missing'}):r.continue())
 await page.reload();await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.locator('[data-slot-state="open"]').waitFor();await page.getByRole('button',{name:'选择存档 1',exact:true}).click();await page.getByRole('button',{name:'重试载入地图',exact:true}).waitFor();assert((await page.locator('.map-error').innerText()).includes('global-room.json'));fail=false;await page.getByRole('button',{name:'重试载入地图',exact:true}).click();await page.locator('.map-error').waitFor({state:'detached'});await page.getByRole('button',{name:'怪物图鉴',exact:true}).click();await page.getByRole('dialog',{name:'怪物图鉴',exact:true}).waitFor();assert.deepEqual(errors,[])
 if(process.argv.includes('--encounter')){
  await page.keyboard.press('Escape');await page.locator('.map-flag').getByRole('button',{name:'1. 利尼维亚城堡',exact:true}).click();await page.getByRole('button',{name:'战役',exact:true}).click();await page.getByRole('button',{name:'战斗',exact:true}).click();await waitForGame(page)
  await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/WorldRenderer.ts')),{WorldRenderer}=await import(r.name),render=WorldRenderer.prototype.renderTowers;WorldRenderer.prototype.renderTowers=function(...args){render.apply(this,args);window.enemyBookWorld=this}});await page.waitForFunction(()=>window.enemyBookWorld?.session)
  await page.evaluate(()=>window.enemyBookWorld.session.spawnCinematicEnemy('enemy_crow',1,{x:500,y:400}));await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.progress.v1')).discoveredEnemies?.includes('enemy_crow'));await page.reload();assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress.discoveredEnemies)).includes('enemy_crow'))
 }
 console.log('503 auto recovery, 404 manual retry without losing save, native enemy book entry/detail/20-row pagination/locked entries/Escape verified'+(process.argv.includes('--encounter')?' with encounter persistence':'')+': '+url)
}finally{await browser.close()}
