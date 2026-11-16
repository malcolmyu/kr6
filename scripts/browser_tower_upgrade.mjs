import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {installReplayFixture,waitForGame,confirmTowerAction} from './browser_helpers.mjs'
import {TowerSystem} from '../src/game/TowerSystem.ts'
const templates=JSON.parse(readFileSync('public/data/entities.json')),level=JSON.parse(readFileSync('public/data/level02.json')),sites=new TowerSystem(level,'campaign',templates).sites.filter(s=>!s.tower)
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 await installReplayFixture(page);page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 // Native GUI unlocks 1.5 seconds before the introduction camera finishes returning.
 await page.waitForTimeout(1700)
 const canvas=await page.locator('.viewport canvas').boundingBox()
 const click=async site=>page.mouse.click(canvas.x+(site.pos.x+512/3)/(768*16/9)*canvas.width,canvas.y+(768-site.pos.y)/768*canvas.height)
 for(const [index,[kind,label]] of [['archers','弓箭塔'],['wizard','法师塔'],['knights','兵营'],['catapult','投石塔']].entries()) {
  const site=sites[index]
  await click(site);if(index===0){await page.waitForTimeout(250);await page.screenshot({path:'analysis/web-radial-build-menu.png'})};await confirmTowerAction(page,`${label} · ${templates[`tower_${kind}_lvl1`].tower.price}`);await page.waitForTimeout(1100)
  for(const lv of [2,3,4]){await click(site);await confirmTowerAction(page,`升级 · ${templates[`tower_${kind}_lvl${lv}`].tower.price}`);await page.waitForTimeout(500)}
  if(kind==='knights')await page.waitForTimeout(1500)
  await page.screenshot({path:`analysis/web-upgraded-${kind}.png`})
  await click(site);assert.equal(await page.getByRole('button',{name:/^升级 ·/}).count(),0)
  await confirmTowerAction(page,/^出售 ·/);await page.waitForTimeout(500)
 }
 assert.equal(await page.locator('[data-hud=gold]').innerText(),'5000','All pre-wave upgrades must be fully refunded')
 assert.deepEqual(errors,[]);assert.equal(await page.getByRole('alert').count(),0)
 console.log('Browser fixture: all four original level-2/3/4 tower visuals, barracks replacement, build/upgrade/sell dust and full pre-wave refunds; no render errors')
} finally {await browser.close()}
