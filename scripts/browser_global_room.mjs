import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {waitForGame} from './browser_helpers.mjs'
const art=JSON.parse(readFileSync('public/data/global-room.json')),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{if(!localStorage.getItem('kingdom-rush-6.progress.v1'))localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3,iron:true},2:{campaign:3,iron:true},3:{campaign:3}},onboarding:{stage1:true,stage2:true,comic2:true}}))})
 async function menu(){await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.getByRole('button',{name:'选择存档 1',exact:true}).click();await page.locator('.native-map').waitFor();await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'})}
 const room=page.getByRole('dialog',{name:'全局升级',exact:true}),profile=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress)
 async function open(points){await page.locator('.native-map').getByRole('button',{name:'升级',exact:true}).click();await room.getByRole('button',{name:'混沌掌控',exact:true}).waitFor();await page.waitForTimeout(650);assert.equal(await room.getAttribute('data-points'),String(points))}
 async function buy(kind,id){const b=room.getByRole('button',{name:art.labels[kind][id].title,exact:true});await b.click();await b.click();await page.waitForFunction(({kind,id})=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress.globalUpgrades?.[kind]?.includes(id),{kind,id})}
 await page.goto('http://127.0.0.1:5173/');await menu();await open(4);await page.screenshot({path:'analysis/web-global-room-main.png'})
 await buy('mages','l1');assert.equal(await room.getAttribute('data-points'),'3');await buy('mages','l2');assert.equal(await room.getAttribute('data-points'),'1');await buy('artillery','l1');assert.equal(await room.getAttribute('data-points'),'0')
 const before=JSON.stringify((await profile()).globalUpgrades),blocked=room.getByRole('button',{name:art.labels.artillery.l2.title,exact:true});await blocked.click();await blocked.click();assert.equal(JSON.stringify((await profile()).globalUpgrades),before,'unaffordable confirmation does not persist a purchase')
 await page.waitForTimeout(650);assert.equal(await room.locator('[data-ui-node=animation_upgrade_select_fx]').count(),0,'purchase glow expires instead of retaining a reactive proxy');await page.screenshot({path:'analysis/web-global-room-purchased.png'});await page.keyboard.press('Escape');await room.waitFor({state:'hidden'})
 await page.reload();await menu();await open(0);assert.equal(JSON.stringify((await profile()).globalUpgrades),before)
 await page.setViewportSize({width:1080,height:1920});await page.waitForTimeout(100);await page.screenshot({path:'analysis/web-global-room-tall.png'});const bounds=await room.getByRole('button',{name:'重置全部塔升级',exact:true}).boundingBox();assert(bounds&&bounds.y>=0&&bounds.y+bounds.height<1920)
 await room.getByRole('button',{name:'重置全部塔升级',exact:true}).click();assert.equal(await room.getAttribute('data-points'),'4');assert.deepEqual((await profile()).globalUpgrades,{})
 await buy('mages','l1');await buy('mages','l2');await buy('artillery','l1');await room.getByRole('button',{name:'关闭全局升级',exact:true}).click();await room.waitFor({state:'hidden'});await page.setViewportSize({width:1280,height:720})
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(url),advance=GameSession.prototype.advance;GameSession.prototype.advance=function(dt){advance.call(this,dt);window.globalRoomSession=this}})
 await page.locator('.native-map').getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await page.getByRole('button',{name:'战役',exact:true}).click();await page.getByRole('button',{name:'战斗',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.globalRoomSession)
 assert.deepEqual(await page.evaluate(()=>({min:window.globalRoomSession.combat.templates.bolt_tower_wizard_lvl1.bullet.damage_min,price:window.globalRoomSession.towers.price('wizard'),radius:window.globalRoomSession.combat.templates.bullet_catapult_lvl1.bullet.damage_radius})),{min:6.8999999999999995,price:90,radius:66})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Default-URL map global room: original four trees/art/labels, native4-point budget, ordinary confirmations/overspend refusal, all-tree reset, reload, tall backdrop and actual next-battle mage minimum/90-price/catapult radius verified; no page/asset errors. Full video/font/shader fidelity remains unverified.')
}finally{await browser.close()}
