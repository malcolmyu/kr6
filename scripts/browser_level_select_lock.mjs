import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},lastPlayed:{stage:3,mode:'campaign'}})))
 await page.goto('http://127.0.0.1:5173/');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.locator('[data-slot-state="open"]').waitFor();await page.getByRole('button',{name:'选择存档 1',exact:true}).click();await page.locator('.native-map').waitFor();await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'})
 await page.locator('.map-flag').getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();const dialog=page.getByRole('dialog',{name:'选择关卡模式',exact:true});await page.locator('[aria-label="选择关卡模式"][data-popup-state="open"]').waitFor()
 assert.equal(await dialog.getByRole('button',{name:'战斗',exact:true}).count(),1)
 await dialog.getByRole('button',{name:'钢铁挑战',exact:true}).click();await dialog.locator('[data-ui-node="button_select_locked"]').waitFor();assert.equal(await dialog.getByRole('button',{name:'战斗',exact:true}).count(),0,'uncompleted campaign cannot start iron')
 const lockedText=await dialog.locator('[data-ui-node="label_button_fight_locked"]').innerText();assert(lockedText.length>0&&!lockedText.includes('MODE_SELECTION_'))
 assert.equal(await dialog.locator('[data-ui-node="group_mode_iron_info"]').count(),1)
 await page.screenshot({path:'analysis/web-native-level-select-iron-locked.png'})
 await dialog.getByRole('button',{name:'战役',exact:true}).click();await dialog.getByRole('button',{name:'战斗',exact:true}).waitFor();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
 assert.equal(await page.locator('.native-map').count(),1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress.levels[3]),undefined,'viewing a locked mode must not award completion')
 assert.deepEqual(errors,[])
 console.log('Native level-select browser: unlocked stage3 campaign, original locked iron panel/text, no fight action, switching back and Escape close; progress unchanged')
}finally{await browser.close()}
