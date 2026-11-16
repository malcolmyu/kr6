import {selectDefaultSlot} from './browser_helpers.mjs'
import {waitForGame} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {installReplayFixture,confirmTowerAction} from './browser_helpers.mjs'
const shotFiles=JSON.parse(readFileSync('public/data/audio.json')).sounds.TowerScholarMageBasicAttack.files
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 await installReplayFixture(page)
 await page.addInitScript(()=>{Math.random=()=>.5})
 const errors=[],audio=new Set()
 page.on('pageerror',e=>errors.push(e.message))
 page.on('response',r=>{if(r.ok()&&r.url().includes('/audio/'))audio.add(r.url())})
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click()
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.waitForFunction(()=>{const button=document.querySelector('button.next-wave');return button && !button.disabled})
 const canvas=await page.locator('.viewport canvas').boundingBox()
 await page.mouse.click(canvas.x+(829+512/3)/(768*16/9)*canvas.width,canvas.y+(768-259)/768*canvas.height)
 await confirmTowerAction(page,'法师塔 · 100')
 await page.waitForTimeout(1200)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click()
 await page.waitForTimeout(13000)
 await page.screenshot({path:'analysis/web-wizard-combat.png'})
 await page.waitForFunction(()=>Number(document.querySelector('[data-hud=gold]')?.textContent?.replace(/\D/g,''))>145,{},{timeout:45000})
 assert(audio.size>0)
 assert([...audio].some(url=>shotFiles.some(file=>url.endsWith(file))),'Original mage shot audio must be requested')
 assert.deepEqual(errors,[])
 assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser: wizard animations, paired tracking bolts, hit art, original shot audio and kill gold; no page errors')
} finally {await browser.close()}
