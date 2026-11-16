// Isolated browser contexts can exercise the original completed-campaign replay
// without bypassing the first-play tutorial in the application.
export async function installReplayFixture(page) {
 await page.addInitScript(()=>{if(!localStorage.getItem('kingdom-rush-6.progress.v1'))localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3}}}))})
}
export async function skipComic(page) {
 if(!await page.locator('.comic-screen').count())return
 for(let number=1;number<=2;number++){
  await page.locator(`.comic-screen[data-comic-page="${number}"] .comic-hit`).waitFor()
  if(number===1)await page.waitForFunction(()=>Number(document.querySelector('.comic-screen')?.getAttribute('data-frame'))>=15)
  if(await page.locator('.comic-screen').getAttribute('data-playing')==='true')await page.getByRole('button',{name:'漫画：点击快进',exact:true}).click()
  await page.getByRole('button',{name:'漫画：点击继续',exact:true}).click()
 }
 await page.locator('.comic-screen').waitFor({state:'hidden'})
}
export async function waitForGame(page) {
 await page.locator('.game-frame[aria-busy="false"]').waitFor()
 await skipComic(page)
 await page.evaluate(()=>document.fonts.ready)
 await page.locator('.game-frame[aria-busy="false"][data-cinematic="false"]').waitFor()
}
// Native mobile quick menu first arms an icon, then confirms the selected action.
export async function confirmTowerAction(page,name) {
 const button=page.getByRole('button',{name,exact:typeof name==='string'})
 await button.click()
 if(await button.getAttribute('aria-pressed')!=='true')throw new Error('Tower action must arm before confirmation')
 await button.click()
}
// Follow the native slot route through visible UI; a used slot enters the map first.
export async function selectDefaultSlot(page) {
 await page.locator('[role="dialog"][aria-label="选择存档"][data-slot-state="open"]').waitFor()
 const used=await page.locator('[data-ui-node="slot_1"] [data-ui-node="slot_used"]').count()>0
 await page.getByRole('button',{name:'选择存档 1',exact:true}).click()
 if(used){
  await page.locator('.native-map').waitFor()
  await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'})
  await page.locator('.map-flag').getByRole('button',{name:'1. 利尼维亚城堡',exact:true}).click()
  await page.getByRole('button',{name:'战役',exact:true}).click();await page.getByRole('button',{name:'战斗',exact:true}).click()
 }
}
