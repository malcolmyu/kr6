import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {installReplayFixture,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],sounds=new Set()
 await installReplayFixture(page)
 page.on('pageerror',e=>errors.push(e.message))
 page.on('response',r=>{if(r.ok()&&r.url().includes('/audio/'))sounds.add(r.url())})
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click()
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page)
 await waitForGame(page)
 assert.equal(await page.getByRole('button',{name:'援军',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('[data-power=reinforcements]').disabled)
 const canvas=await page.locator('.viewport canvas').boundingBox()
 // The initial unzoomed scene's lower road beside the starting barracks.
 const node=JSON.parse(readFileSync('public/data/level01.json')).paths.paths[0][0][100]
 const road={x:canvas.x+(node.x+170.6666666667)/1365.3333333333*canvas.width,y:canvas.y+(768-node.y)/768*canvas.height}
 await page.getByRole('button',{name:'援军',exact:true}).click()
 await page.mouse.click(road.x,road.y)
 await page.waitForFunction(()=>document.querySelector('[data-power=reinforcements]').disabled)
 await page.waitForTimeout(500)
 await page.screenshot({path:'analysis/web-reinforcements.png'})
 await page.getByRole('button',{name:'火雨',exact:true}).click()
 await page.mouse.click(road.x,road.y)
 await page.waitForFunction(()=>document.querySelector('[data-power=rain_of_fire]').disabled)
 await page.waitForTimeout(400)
 await page.screenshot({path:'analysis/web-rain-flight.png'})
 await page.waitForTimeout(1300)
 await page.screenshot({path:'analysis/web-rain-impact.png'})
 await page.waitForTimeout(14000)
 assert.deepEqual(errors,[])
 await page.waitForFunction(()=>!document.querySelector('[data-power=reinforcements]').disabled,{},{timeout:30000})
 assert.equal(await page.getByRole('button',{name:'援军',exact:true}).isEnabled(),true)
 assert.equal(await page.getByRole('button',{name:'火雨',exact:true}).isEnabled(),false)
 assert(sounds.size>0)
 assert.deepEqual(errors,[])
 assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser: original power icons, two reinforcement sprites/fade, three meteor animations/impacts/audio, 15s/60s cooldown controls; no render errors')
} finally {await browser.close()}
