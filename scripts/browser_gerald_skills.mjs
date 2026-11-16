import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_gerald:1000},heroUpgrades:{hero_gerald:['skill_a','skill_b']}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{const r=performance.getEntriesByType('resource'),get=async n=>import(r.find(x=>x.name.includes('/src/game/'+n+'.ts')).name),{WorldRenderer}=await get('WorldRenderer'),{GameSession}=await get('GameSession'),render=WorldRenderer.prototype.renderEnemyEffects,advance=GameSession.prototype.advance;WorldRenderer.prototype.renderEnemyEffects=function(){render.call(this);window.geraldWorld=this;window.geraldRenderedAt=this.session.time};GameSession.prototype.advance=function(dt){if(!window.geraldFreeze)advance.call(this,dt)};window.geraldAdvance=advance})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.locator('.scene-transition[data-active="false"]').waitFor({state:'attached'});await page.waitForFunction(()=>window.geraldWorld?.session?.heroes.zefira)
 await page.evaluate(()=>{window.geraldFreeze=true;const g=window.geraldGame=window.geraldWorld.session,s=g.heroes.geraldSkills;window.geraldBaseline=g.heroes.team.map(h=>({name:h.name,armor:h.template.health.armor,magic:h.template.health.magic_armor}));s.apply('skill_b',g.heroes.gerald,g.time);s.apply('skill_a',g.heroes.zefira,g.time);g.paused=true})
 assert.deepEqual(await page.evaluate(()=>({mods:window.geraldGame.heroes.geraldSkills.nativeModifiers.buffs.size,queued:window.geraldGame.entities.registry.pendingInserts.filter(e=>e.template.startsWith('mod_gerald_skill_')).length})),{mods:0,queued:2})
 async function step(ticks=1){await page.evaluate(ticks=>{const g=window.geraldGame;g.paused=false;for(let i=0;i<ticks;i++)window.geraldAdvance.call(g,1/30);g.paused=true},ticks);await page.waitForFunction(()=>window.geraldRenderedAt===window.geraldGame.time)}
 await step()
 const entered=await page.evaluate(()=>{const g=window.geraldGame,r=g.heroes.geraldSkills.nativeModifiers;window.geraldBuffs=[...r.buffs.values()];return{mods:r.buffs.size,arts:window.geraldWorld.geraldSkillsRenderer.sprites.size,refs:[...r.buffs.values()].every(m=>m.pos===m.target.pos),fx:g.entities.registry.pendingInserts.filter(e=>e.template==='fx_gerald_skill_a').length,phases:[...r.buffs.values()].map(m=>m.phase)}})
 assert.deepEqual(entered,{mods:2,arts:2,refs:true,fx:1,phases:['start','start']})
 await page.evaluate(()=>{const g=window.geraldGame;g.heroes.moveGerald({x:530,y:350});g.heroes.selectedId=g.heroes.zefira.id;g.heroes.moveSelected({x:570,y:350})})
 await step(24)
 assert(await page.evaluate(()=>{const g=window.geraldGame,w=window.geraldWorld;return [...g.heroes.geraldSkills.nativeModifiers.buffs.values()].every(m=>{const art=w.geraldSkillsRenderer.sprites.get(m.key),o=m.kind==='skill_b'?m.target.template.unit.mod_offset:{x:0,y:0};return m.phase==='loop'&&Math.abs(art.root.position.x-m.target.pos.x-(o?.x??0))<1e-9&&Math.abs(art.root.position.y-m.target.pos.y-(o?.y??0))<1e-9})&&w.effects.filter(e=>e.model?.name==='fx_gerald_skill_a').every(e=>Math.abs(e.art.root.position.x-e.model.pos.x)<1e-9)}))
 await page.screenshot({path:'analysis/web-gerald-native-buffs-active.png'})
 await page.evaluate(()=>{const g=window.geraldGame;g.heroes.geraldSkills.apply('skill_a',g.heroes.zefira,g.time)})
 await step();assert(await page.evaluate(()=>window.geraldGame.heroes.geraldSkills.nativeModifiers.buffs.size===2&&window.geraldGame.entities.events.some(e=>e.template==='mod_gerald_skill_a'&&e.kind==='insertRejected')))
 await step(165)
 assert(await page.evaluate(()=>{const r=window.geraldGame.heroes.geraldSkills.nativeModifiers;return r.buffs.size===1&&[...r.buffs.values()][0].kind==='skill_b'}))
 await step(8)
 const fading=await page.evaluate(()=>{const m=[...window.geraldGame.heroes.geraldSkills.nativeModifiers.buffs.values()][0],art=window.geraldWorld.geraldSkillsRenderer.sprites.get(m.key);return{phase:m.phase,alpha:m.alpha,opacity:art.opacity}});assert.equal(fading.phase,'fade');assert(fading.alpha>0&&fading.alpha<255);assert.equal(fading.opacity,fading.alpha/255)
 await page.screenshot({path:'analysis/web-gerald-native-buffs-fade.png'});await step(40)
 assert(await page.evaluate(()=>{const g=window.geraldGame,w=window.geraldWorld;return g.heroes.geraldSkills.nativeModifiers.buffs.size===0&&w.geraldSkillsRenderer.sprites.size===0&&!g.nativeEffects.some(m=>m.name==='fx_gerald_skill_a')&&![...g.entities.registry.entities.values()].some(e=>e.template==='mod_gerald_skill_a'||e.template==='mod_gerald_skill_b')&&g.heroes.team.every(h=>{const b=window.geraldBaseline.find(b=>b.name===h.name);return Math.abs(h.template.health.armor-b.armor)<1e-12&&Math.abs(h.template.health.magic_armor-b.magic)<1e-12})}))
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Chrome actual Gerald modifiers: legal purchases, queued→next-flush armor/EXOs/own-main FX, moving target and FX reference positions, duplicate refresh rejection, original courage ending/shield tween opacity and complete renderer/entity/armor cleanup. Controlled direct modifier applications; natural casts/reflect packet timing are covered by the separate whole native differential, not this browser fixture.')
}finally{await browser.close()}
