import {selectDefaultSlot} from './browser_helpers.mjs'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import {installReplayFixture,confirmTowerAction,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
await installReplayFixture(page)
await page.addInitScript(()=>{
 // Reproducible damage rolls and audio variants for this browser fixture.
 Math.random=()=>.5
 window.__audioStarts=0
 const start=AudioBufferSourceNode.prototype.start
 AudioBufferSourceNode.prototype.start=function(...args){window.__audioStarts++;return start.apply(this,args)}
})
const errors=[]
const audioFiles=new Set()
page.on('response',response=>{if(response.url().includes('/audio/')&&response.ok())audioFiles.add(response.url().split('/').at(-1))})
page.on('pageerror',e=>errors.push(e.message))
await page.goto('http://127.0.0.1:5173/?debug=1')
async function enterGame(){
 await page.getByRole('button',{name:'开始游戏',exact:true}).click()
 await page.waitForTimeout(2000)
 await page.screenshot({path:'analysis/web-opening.png'})
 await page.getByRole('button',{name:'点击开始',exact:true}).waitFor()
 await page.waitForTimeout(2200)
 await page.screenshot({path:'analysis/web-main-menu.png'})
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page)
 await waitForGame(page)
}
await enterGame()
await page.getByRole('button',{name:'开始战斗'}).waitFor({state:'visible'})
await page.waitForFunction(()=>{const button=document.querySelector('button.next-wave');return button && !button.disabled})
const canvas=await page.locator('.viewport canvas').boundingBox()
await page.mouse.click(canvas.x+(829+512/3)/(768*16/9)*canvas.width,canvas.y+(768-259)/768*canvas.height)
await confirmTowerAction(page,'弓箭塔 · 70')
await page.waitForTimeout(1200)
await page.screenshot({path:'analysis/web-built-archers.png'})
assert.deepEqual(errors,[])
await page.getByRole('button',{name:'开始战斗'}).click()
await page.waitForTimeout(5000)
await page.screenshot({path:'analysis/web-first-wave.png'})
assert.deepEqual(errors,[])
await page.waitForFunction(()=>Number(document.querySelector('[data-hud=gold]')?.textContent?.replace(/\D/g,''))>175,{},{timeout:60000})
await page.screenshot({path:'analysis/web-archer-combat.png'})
const gold=Number((await page.locator('[data-hud=gold]').innerText()).replace(/\D/g,''))
assert(gold>175,'Browser combat should award gold after a lethal arrow hit')
assert(await page.evaluate(()=>window.__audioStarts)>=5,'Original decoded audio events must start in Web Audio')
assert([...audioFiles].some(file=>file.startsWith('kr6_sfx_towers_archerGarrison_basicAttack_')))
assert([...audioFiles].some(file=>file.startsWith('kr6_sfx_enemy_bandit_death_')))
assert.equal(await page.getByRole('alert').count(),0)
await page.getByRole('button',{name:'静音',exact:true}).click()
await page.getByRole('button',{name:'开启声音',exact:true}).waitFor()
await page.getByRole('button',{name:'开启声音',exact:true}).click()
await page.getByRole('button',{name:'暂停',exact:true}).click()
await page.getByRole('button',{name:'继续',exact:true}).waitFor()
for(const name of ['2. 奥术魔法学院','3. 遭受入侵的农田']) {
 await page.getByRole('button',{name}).click()
 await page.waitForFunction(()=>{const button=document.querySelector('button.next-wave');return button && !button.disabled})
 await page.getByRole('button',{name:'开始战斗'}).click()
 await page.waitForTimeout(2500)
}
assert.deepEqual(errors,[])
for(const tower of ['法师塔 · 100','兵营 · 70','投石塔 · 110']) {
 await page.reload()
 await enterGame()
 await page.waitForFunction(()=>{const button=document.querySelector('button.next-wave');return button && !button.disabled})
 const box=await page.locator('.viewport canvas').boundingBox()
 await page.mouse.click(box.x+(498+512/3)/(768*16/9)*box.width,box.y+(768-264)/768*box.height)
 await confirmTowerAction(page,tower)
 await page.waitForTimeout(1200)
 assert.deepEqual(errors,[])
}
await browser.close()
console.log('Browser: three maps, animated spawns, pause and four original tower constructions; no page errors')
