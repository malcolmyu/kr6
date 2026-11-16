import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 async function menu(){await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.locator('[data-slot-state="open"]').waitFor()}
 async function settled(){await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'})}
 await page.goto('http://127.0.0.1:5173/?debug=1');await menu()
 assert.equal(await page.locator('[data-ui-node="slot_empty"]').count(),3)
 await page.screenshot({path:'analysis/web-slots-empty.png'})
 await page.getByRole('button',{name:'关闭存档列表',exact:true}).click();await page.locator('[aria-label="选择存档"]').waitFor({state:'hidden'})
 await page.getByRole('button',{name:'点击开始',exact:true}).click();await page.locator('[data-slot-state="in"]').waitFor();await page.screenshot({path:'analysis/web-slots-in.png'});await page.locator('[data-slot-state="open"]').waitFor()
 await page.getByRole('button',{name:'选择存档 2',exact:true}).click();await page.locator('.comic-screen').waitFor();await settled()
 let saved=await page.evaluate(()=>({slot:localStorage.getItem('kingdom-rush-6.slot.2.v1'),active:localStorage.getItem('kingdom-rush-6.active-slot.v1')}));assert.equal(saved.active,'2');assert.deepEqual(JSON.parse(saved.slot).progress,{levels:{},onboarding:{stage1:true},lastPlayed:{stage:1,mode:'campaign'}})
 // Add an isolated old-version profile, then reload: it migrates once to slot 1.
 await page.evaluate(()=>{localStorage.removeItem('kingdom-rush-6.slots-migrated.v1');localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3}}}))})
 await page.reload();await menu()
 assert.equal(await page.locator('[data-ui-node="slot_used"]').count(),2)
 assert.equal(await page.locator('[data-ui-node="slot_1"] [data-ui-node="label_stars"]').innerText(),'3')
 assert.equal(await page.locator('[data-ui-node="slot_2"] [data-ui-node="label_stars"]').innerText(),'0')
 await page.screenshot({path:'analysis/web-slots-used.png'})
 await page.getByRole('button',{name:'删除存档 1',exact:true}).click();assert.equal(await page.getByRole('button',{name:'选择存档 1',exact:true}).count(),0);await page.screenshot({path:'analysis/web-slots-delete.png'})
 await page.getByRole('button',{name:'取消删除存档 1',exact:true}).click();assert.equal(await page.getByRole('button',{name:'选择存档 1',exact:true}).count(),1)
 await page.getByRole('button',{name:'删除存档 1',exact:true}).click();await page.getByRole('button',{name:'确认删除存档 1',exact:true}).click()
 assert.equal(await page.locator('[data-ui-node="slot_1"] [data-ui-node="slot_empty"]').count(),1)
 assert.equal(await page.evaluate(()=>localStorage.getItem('kingdom-rush-6.slot.1.v1')),null);assert(await page.evaluate(()=>localStorage.getItem('kingdom-rush-6.slot.2.v1')))
 await page.getByRole('button',{name:'选择存档 2',exact:true}).click();await page.locator('.native-map').waitFor();await settled();assert.equal(await page.locator('.comic-screen').count(),0);assert.equal(await page.locator('.map-flag').count(),1)
 await page.screenshot({path:'analysis/web-slots-existing-map.png'})
 await page.reload();await menu();assert.equal(await page.locator('[data-ui-node="slot_1"] [data-ui-node="slot_empty"]').count(),1);assert.equal(await page.locator('[data-ui-node="slot_2"] [data-ui-node="slot_used"]').count(),1)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser: original three-slot popup/art and close/reopen; fresh slot 2 enters comic; reload retains it; legacy slot 1 migration, inline delete/cancel/confirm, independence, no resurrection, and existing zero-star slot enters map verified')
}finally{await browser.close()}
