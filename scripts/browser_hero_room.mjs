import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);process.stderr.write(e.message+'\n')});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_gerald:1000}})))
 await page.route('**/data/level02-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:300},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:1}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.getByRole('button',{name:'2. 奥术魔法学院',exact:true}).click();await waitForGame(page)
 await page.getByRole('button',{name:'开始战斗',exact:true}).click();const confirm=page.getByRole('button',{name:'确认出击',exact:true});if(await confirm.count())await confirm.click()
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/AudioManager.ts')).name,{AudioManager}=await import(url),trigger=AudioManager.prototype.trigger;window.roomAudio=[];AudioManager.prototype.trigger=function(name,...args){window.roomAudio.push(name);return trigger.call(this,name,...args)}})
 await page.locator('.native-outcome').waitFor({timeout:20000});await page.locator('.native-outcome').getByRole('button',{name:'继续',exact:true}).click()
 await page.locator('.native-map').getByRole('button',{name:'英雄',exact:true}).click();const room=page.getByRole('dialog',{name:'英雄技能',exact:true});await room.waitFor();await page.waitForTimeout(700)
 await page.screenshot({path:'analysis/web-hero-room-initial.png'})
 assert.equal(await room.getAttribute('data-points'),'4')
 const courage=room.getByRole('button',{name:'英勇鼓舞 1级',exact:true});await courage.click();await page.waitForTimeout(300);await page.screenshot({path:'analysis/web-hero-room-tooltip.png'});await courage.click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.progress.v1')).heroUpgrades?.hero_gerald?.includes('skill_a'))
 assert.equal(await room.getAttribute('data-points'),'3');await room.locator('[data-ui-node=animation_upgrade_select_fx] img').waitFor();await page.waitForTimeout(120);await page.screenshot({path:'analysis/web-hero-room-buy-fx.png'});await page.waitForTimeout(650);assert.equal(await room.locator('[data-ui-node=animation_upgrade_select_fx]').count(),0);await page.screenshot({path:'analysis/web-hero-room-purchased.png'})
 const shield=room.getByRole('button',{name:'惩戒之盾 1级',exact:true});await shield.click();await shield.click();assert.equal(await room.getAttribute('data-points'),'1')
 await room.getByRole('button',{name:'关闭英雄技能',exact:true}).click();assert.equal(await room.count(),0)
 await page.locator('.native-map').getByRole('button',{name:'英雄',exact:true}).click();await room.waitFor();assert.equal(await room.getAttribute('data-points'),'1');await room.getByRole('button',{name:'泽菲拉',exact:true}).click();assert.equal(await room.getAttribute('data-hero'),'hero_zefira');assert.equal(await room.getAttribute('data-points'),'0');await room.getByRole('button',{name:'杰拉尔德',exact:true}).click();assert.equal(await room.getAttribute('data-points'),'1');await room.getByRole('button',{name:'重置英雄技能',exact:true}).click();assert.equal(await room.getAttribute('data-points'),'4')
 const audio=await page.evaluate(()=>window.roomAudio);for(const name of ['GUIBuyUpgrade','GUIHeroSkillSelect','GUIResetUpgrade','GUIHeroScroll'])assert(audio.includes(name),name)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser hero room: native map entry, original tree art, two-click purchases, actual point spending/persistent save/reopen and reset, no page or missing asset errors')
}finally{await browser.close()}
