import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
const rows=JSON.parse(readFileSync('analysis/defend-point-oracle.json')).filter(r=>r.tick===1),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[],report=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3},3:{campaign:3}},onboarding:{stage1:true,stage2:true,comic2:true}})))
 await page.goto('http://127.0.0.1:5173/');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.locator('[data-slot-state="open"]').waitFor();await page.getByRole('button',{name:'选择存档 1',exact:true}).click();await page.locator('.native-map').waitFor();await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'})
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/WorldRenderer.ts'))
  const {WorldRenderer}=await import(resource.name),load=WorldRenderer.prototype.load
  WorldRenderer.prototype.load=async function(...args){const result=await load.apply(this,args);window.markerWorld=this;return result}
 })
 for(const stage of [1,2,3]){
  await page.locator('.map-flag').getByRole('button',{name:`${stage}. ${['利尼维亚城堡','奥术魔法学院','遭受入侵的农田'][stage-1]}`,exact:true}).click();await page.locator('[aria-label="选择关卡模式"][data-popup-state="open"]').waitFor()
  if(stage===3)await page.getByRole('dialog',{name:'选择关卡模式',exact:true}).getByRole('button',{name:'钢铁挑战',exact:true}).click()
  await page.getByRole('dialog',{name:'选择关卡模式',exact:true}).getByRole('button',{name:'战斗',exact:true}).click();await page.locator('.game-frame[aria-busy="false"]').waitFor();await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'});await page.waitForFunction(()=>window.markerWorld?.session?.tick>2)
  const actual=await page.evaluate(()=>window.markerWorld.environment.parts.filter(p=>p.config.name==='defense_point_decal').map(p=>({name:p.config.name,pos:{x:p.art.root.position.x,y:p.art.root.position.y},alpha:p.art.root.children[0].material.opacity,z:p.art.root.children[0].renderOrder,flip:p.art.root.scale.x<0,anchor:p.config.anchor})))
  assert.deepEqual(actual,rows.filter(r=>r.stage===stage).map(r=>({name:r.name,pos:r.pos,alpha:r.alpha/255,z:r.z,flip:r.flip,anchor:r.anchor})))
  const bounds=await page.locator('.viewport canvas').boundingBox();assert.deepEqual(bounds,{x:0,y:0,width:1280,height:720});assert.equal(await page.locator('.debug-shell').count(),0)
  report.push({stage,mode:stage===3?'iron':'campaign',markers:actual,bounds});await page.screenshot({path:`analysis/web-defend-points-${stage}.png`})
  await page.getByRole('button',{name:'暂停',exact:true}).click();await page.getByRole('button',{name:'退出关卡',exact:true}).click();await page.getByRole('dialog',{name:'确认退出关卡',exact:true}).getByRole('button',{name:'是',exact:true}).click();await page.locator('.native-map').waitFor();await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'})
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);writeFileSync('analysis/browser-defend-points.json',JSON.stringify(report,null,2)+'\n');console.log('Original five defend markers match atlas/position/alpha/z/flip/anchor in all three stage renderers; normal1280×720 UI fills the video viewport without debug chrome, native map/pause navigation and no missing resources/errors')
}finally{await browser.close()}
