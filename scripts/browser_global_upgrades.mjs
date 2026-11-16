import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{if(!localStorage.getItem('kingdom-rush-6.progress.v1'))localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3,iron:true},2:{campaign:3,iron:true},3:{campaign:3}},globalUpgrades:{mages:['l1'],artillery:['l1']}}))})
 async function enter(){await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
  await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),advance=GameSession.prototype.advance;GameSession.prototype.advance=function(dt){advance.call(this,dt);window.globalUpgradeSession=this}});await page.waitForFunction(()=>window.globalUpgradeSession)
 }
 await page.goto('http://127.0.0.1:5173/?debug=1');await enter()
 const profile=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress)
 assert.deepEqual((await profile()).globalUpgrades,{mages:['l1'],artillery:['l1']})
 const inspect=()=>page.evaluate(()=>({min:window.globalUpgradeSession.combat.templates.bolt_tower_wizard_lvl1.bullet.damage_min,max:window.globalUpgradeSession.combat.templates.bolt_tower_wizard_lvl1.bullet.damage_max,radius:window.globalUpgradeSession.combat.templates.bullet_catapult_lvl1.bullet.damage_radius,price:window.globalUpgradeSession.towers.price('wizard')}))
 assert.deepEqual(await inspect(),{min:6.8999999999999995,max:9,radius:66,price:100})
 await page.reload();await enter();assert.deepEqual(await inspect(),{min:6.8999999999999995,max:9,radius:66,price:100});assert.deepEqual((await profile()).globalUpgrades,{mages:['l1'],artillery:['l1']})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser saved global foundation: normal slot load/reload preserves legal native selection and applies mage7–9 minimum, catapult radius66 and unchanged100 build price to actual GameSession; no page/asset errors. Purchase-room UI and remaining controller upgrades are not covered.')
}finally{await browser.close()}
