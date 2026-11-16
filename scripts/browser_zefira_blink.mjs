import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_zefira:15000},heroUpgrades:{hero_zefira:['skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e','skill_c']}})))
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=name=>performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/'+name+'.ts')).name
  const {GameSession}=await import(resource('GameSession')),{damageSoldier}=await import(resource('SoldierHealth')),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(this.blinkFixture===undefined&&this.heroes.zefira&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    this.blinkFixture=this.time;this.blinkSounds=[];const sound=this.onSound;this.onSound=name=>{this.blinkSounds.push(name);sound(name)}
    this.heroes.selectedId=this.heroes.zefira.id;this.heroes.moveSelected({x:700,y:350})
   }
   if(this.blinkFixture!==undefined){const h=this.heroes.zefira,m=this.heroes.zefiraMovement
    if(m.state&&this.blinkDamage===undefined){const before=h.hp;damageSoldier(h,{value:999,damage_type:1},this.time);this.blinkDamage=before-h.hp}
    window.blinkSession=this;window.blinkObservation={age:this.time-this.blinkFixture,level:m.level,pos:{...h.pos},hp:h.hp,damage:this.blinkDamage,hidden:h.template.health_bar.hidden,ignore:!!h.ignoreDamage,phase:m.state?.phase,buff:m.buff?.phase,factor:h.template.unit.damage_factor,sounds:this.blinkSounds}
    const o=window.blinkObservation
    if(!this.blinkMilestone&&o.phase==='teleport_out'||this.blinkMilestone===1&&o.phase==='teleport_in'||this.blinkMilestone===2&&o.buff==='loop'||this.blinkMilestone===3&&o.buff==='out'){this.blinkMilestone=(this.blinkMilestone??0)+1;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 const shot=async(name,condition)=>{await page.waitForFunction(condition);await page.screenshot({path:`analysis/web-zefira-blink-${name}.png`});await page.evaluate(()=>{window.blinkSession.paused=false})}
 await shot('out',()=>window.blinkObservation?.phase==='teleport_out')
 assert.equal(await page.evaluate(()=>window.blinkObservation.damage),0)
 await shot('in',()=>window.blinkObservation?.phase==='teleport_in')
 await shot('buff',()=>window.blinkObservation?.buff==='loop')
 const buff=await page.evaluate(()=>window.blinkObservation);assert.equal(buff.level,1);assert.equal(buff.factor,1.3);assert.deepEqual(buff.pos,{x:700,y:350});assert.equal(buff.ignore,false);assert.equal(buff.hidden,false)
 await shot('end',()=>window.blinkObservation?.buff==='out')
 await page.waitForFunction(()=>window.blinkObservation.age>5.5)
 const end=await page.evaluate(()=>window.blinkObservation);assert(!end.buff);assert(Math.abs(end.factor-1)<1e-10);assert(end.sounds.includes('HeroZefiraAstralBlinkInCast'));assert(end.sounds.includes('HeroZefiraAstralBlinkOutCast'))
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Zefira blink: legal purchased C, ordinary move request, original out/in animations, immunity, exact destination, two EXO modifier layers, ending and factor cleanup; no JS/asset errors')
}finally{await browser.close()}
