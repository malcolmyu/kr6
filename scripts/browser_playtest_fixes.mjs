import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const url=process.argv[2]??'http://127.0.0.1:5176/kr6/',instrument=process.argv.includes('--build-bar'),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{if(!localStorage.getItem('kingdom-rush-6.progress.v1'))localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},onboarding:{stage1:true,stage2:true,comic2:true}}))})
 async function enter(){await page.goto(url);await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)}
 await enter();assert.equal(await page.evaluate(()=>getComputedStyle(document.body).userSelect),'none')
 await page.keyboard.press('q');await page.waitForFunction(()=>document.querySelectorAll('.hero-portrait')[0]?.getAttribute('aria-pressed')==='true')
 if(await page.locator('.hero-portrait').count()>1){await page.keyboard.press('w');await page.waitForFunction(()=>document.querySelectorAll('.hero-portrait')[1]?.getAttribute('aria-pressed')==='true')}
 if(instrument){
  await page.evaluate(async()=>{
   const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/WorldRenderer.ts')),{WorldRenderer}=await import(resource.name),render=WorldRenderer.prototype.renderTowers;window.barSamples=[]
   WorldRenderer.prototype.renderTowers=function(...args){render.apply(this,args);window.playtestWorld=this;for(const v of this.towerVisuals.values())if(v.key.startsWith('tower_build_'))for(const p of v.parts)if(p.config.name==='buildbar')window.barSamples.push(p.art.root.scale.x)}
  });await page.waitForFunction(()=>window.playtestWorld?.session)
  await page.evaluate(()=>{const g=window.playtestWorld.session,s=g.towers.sites.find(s=>!s.tower&&!s.building);if(!s)throw Error('No build site');g.build(s.id,'archers');window.testBuildId=s.id})
  await page.waitForFunction(()=>window.playtestWorld.session.towers.sites.find(s=>s.id===window.testBuildId)?.tower)
  const scales=await page.evaluate(()=>window.barSamples);assert(scales.length>5);assert(Math.min(...scales)<.25);assert(Math.max(...scales)>.8);for(let i=1;i<scales.length;i++)assert(scales[i]>=scales[i-1]);console.log('Actual construction bar advances from '+Math.min(...scales)+' to '+Math.max(...scales)+' across '+scales.length+' draws')
 }
 const selectedHero=page.locator('.hero-portrait[aria-pressed="true"]');if(await selectedHero.count())await selectedHero.click();const start=page.getByRole('button',{name:'开始战斗',exact:true});await page.waitForFunction(()=>!document.querySelector('.wave-hit')?.disabled);const box=await start.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.locator('.power-portrait').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.power-portrait')?.disabled)
 await page.keyboard.press('1');await page.waitForFunction(()=>document.querySelectorAll('.power-portrait')[0]?.getAttribute('aria-pressed')==='true');assert.equal(await page.locator('.hero-portrait[aria-pressed="true"]').count(),0)
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress);await enter();const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-rush-6.slot.1.v1')).progress);assert.deepEqual(after.levels,before.levels);assert(after.onboarding.stage1);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('Reload retains progress; Q/W select heroes, 1 selects power exclusively; page selection disabled; no page/resource errors: '+url)
}finally{await browser.close()}
