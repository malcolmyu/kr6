import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.stack)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3,iron:true},2:{campaign:3,iron:true},3:{campaign:3}},lastPlayed:{stage:3,mode:'iron'}})))
 await page.goto('http://127.0.0.1:5173/')
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.locator('[data-slot-state="open"]').waitFor();await page.getByRole('button',{name:'选择存档 1',exact:true}).click()
 const map=page.getByRole('region',{name:'王国地图'}),dialog=page.getByRole('dialog',{name:'选择关卡模式',exact:true})
 async function settled(){await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'})}
 async function pick(stage,mode){await map.waitFor();await settled();await map.getByRole('button',{name:stage+'. '+['利尼维亚城堡','奥术魔法学院','遭受入侵的农田'][stage-1],exact:true}).click();await dialog.waitFor();await page.locator('[aria-label="选择关卡模式"][data-popup-state="open"]').waitFor({timeout:5000});await dialog.getByRole('button',{name:mode==='iron'?'钢铁挑战':'战役',exact:true}).click()}
 // Compare the same1280×720 iron3 selection surface present at reference page6 t0.
 await map.waitFor();await settled()
 const paper=map.locator('.map-paper'),initial=await paper.evaluate(el=>({transform:getComputedStyle(el).transform,left:parseFloat(el.style.left),top:parseFloat(el.style.top)}));assert(Math.abs(Number(initial.transform.match(/matrix\(([^,]+)/)[1])-720/1339.5)<1e-6)
 await page.mouse.move(600,350);await page.mouse.wheel(0,-120);await page.waitForTimeout(100)
 const zoom=await paper.evaluate(el=>Number(getComputedStyle(el).transform.match(/matrix\(([^,]+)/)[1]));assert(zoom>720/1339.5)
 await page.mouse.move(100,100);await page.mouse.down();await page.mouse.move(250,130,{steps:4});await page.mouse.up()
 // Returning to min zoom also checks that a drag does not block later flag clicks.
 await page.mouse.wheel(0,120);await page.waitForTimeout(100)
 await pick(3,'iron');await page.screenshot({path:'analysis/web-native-level-select-3-iron.png'})
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await map.count(),1)
 for(const [stage,mode]of [[3,'iron'],[1,'campaign'],[1,'iron'],[2,'campaign'],[2,'iron'],[3,'campaign']]){
  await pick(stage,mode)
  assert.equal(await dialog.locator('[data-ui-node="image_stage_preview"] img').getAttribute('src'),`/assets/level_select_stage_preview000${stage}.png`)
  await dialog.getByRole('button',{name:'战斗',exact:true}).click();await waitForGame(page);await settled();await map.waitFor({state:'hidden'})
  assert.equal(await page.locator('header,footer,select[aria-label="模式"]').count(),0,'default surface has no diagnostic chrome')
  const bounds=await page.locator('.game-frame').boundingBox();assert.deepEqual(bounds,{x:0,y:0,width:1280,height:720})
  assert.equal(await page.locator('.game-frame').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px')
  if(stage===3&&mode==='iron')await page.screenshot({path:'analysis/web-native-stage3-iron.png'})
  await page.getByRole('button',{name:'暂停',exact:true}).click();await page.locator('[aria-label="暂停选项"][data-popup-state="open"]').waitFor();await page.getByRole('button',{name:'退出关卡',exact:true}).click();const quit=page.getByRole('dialog',{name:'确认退出关卡',exact:true});await quit.waitFor();await quit.getByRole('button',{name:'是',exact:true}).click();await map.waitFor();await settled()
  console.log(`Native map→${stage}-${mode==='campaign'?1:2}→pause/quit→map verified`)
 }
 // Letterbox a taller window while keeping the game's16:9 camera projection.
 await page.setViewportSize({width:1000,height:900});await pick(1,'campaign');await dialog.getByRole('button',{name:'战斗',exact:true}).click();await waitForGame(page);await settled()
 const tall=await page.locator('.game-frame').boundingBox();assert(Math.abs(tall.width-1000)<.01&&Math.abs(tall.height-562.5)<.01&&Math.abs(tall.y-168.75)<.01)
 await page.screenshot({path:'analysis/web-native-letterbox.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Native default1280×720 surface and tall-window letterbox; original selection art, escape dismissal and all six map entry/quit paths pass without debug controls or page/asset errors')
}finally{await browser.close()}
