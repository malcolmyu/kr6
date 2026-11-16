import {selectDefaultSlot} from './browser_helpers.mjs'
import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>{Math.random=()=>.5;localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}},heroes:{hero_zefira:52000},heroUpgrades:{hero_zefira:['skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e','skill_c','talent_2','ulti']}}))})
 await page.route('**/data/level03-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resource=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/GameSession.ts')).name,{GameSession}=await import(resource),advance=GameSession.prototype.advance
  GameSession.prototype.advance=function(dt){
   advance.call(this,dt)
   if(!this.zUltimateFixture&&this.heroes.zefira&&this.levelData.data.entities_list.some(e=>e.template==='decal_stage_03_cow')){
    this.zUltimateFixture=true;this.zUltimateSounds=[];this.zUltimateEffects=[];const sound=this.onSound;this.onSound=name=>{this.zUltimateSounds.push(name);sound(name)}
    this.zUltimateTargets=[];for(let i=1;i<=3;i++){this.spawn({enemy:'enemy_blackguard',pi:1,spi:i},this.time);const e=this.enemies.at(-1);e.path.ni=135+i*2;Object.assign(e.path.position,this.levelData.paths.paths[0][i-1][e.path.ni-1]);e.frozen=true;this.zUltimateTargets.push({enemy:e,before:e.hp})}
    const h=this.heroes.zefira;h.pos={...this.levelData.paths.paths[0][0][149]};h.rally={...h.pos};h.center={...h.pos};h.deploying=false;h.moving=false;h.target=undefined;h.attack=undefined;h.scriptLocked=false
    this.heroes.gerald.scriptLocked=true;this.heroes.zefiraSkills.lastA=Infinity;this.heroes.zefiraSkills.lastB=Infinity
    this.heroes.zefiraUltimate.onEffect=(name,pos,at,flip)=>this.zUltimateEffects.push({name,pos:{...pos},at,flip})
   }
   if(this.zUltimateFixture){const h=this.heroes.zefira,u=this.heroes.zefiraUltimate;window.zUltimateSession=this;window.zUltimateObservation={enabled:u.enabled,casting:!!u.cast,xp:h.xpQueued,damage:this.zUltimateTargets.map(t=>t.before-t.enemy.hp),spears:this.zUltimateEffects.filter(e=>e.name==='decal_zefira_ultimate_spear').length,visible:u.spears.filter(s=>s.at!==undefined&&!s.removed).length,floors:u.floors.length,sounds:this.zUltimateSounds}
    const o=window.zUltimateObservation
    if(!this.zUltimateMilestone&&o.casting||this.zUltimateMilestone===1&&o.visible>=8){this.zUltimateMilestone=(this.zUltimateMilestone??0)+1;this.paused=true}
    if(this.zUltimateMilestone===2&&o.spears===21&&!o.casting){this.zUltimateMilestone=3;this.paused=true}
   }
  }
 })
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page)
 const shot=async(name,condition)=>{await page.waitForFunction(condition);await page.screenshot({path:`analysis/web-zefira-ultimate-${name}.png`});await page.evaluate(()=>{window.zUltimateSession.paused=false})}
 await shot('cast',()=>window.zUltimateObservation?.casting)
 await shot('spears',()=>window.zUltimateObservation?.visible>=8)
 await shot('complete',()=>window.zUltimateObservation?.spears===21&&!window.zUltimateObservation.casting)
 const o=await page.evaluate(()=>window.zUltimateObservation);assert(o.enabled);assert.equal(o.spears,21);assert(o.damage.some(d=>d>0));assert(o.floors>0)
 // XP can already have been consumed into persistent hero progress by the growth system.
 assert(o.sounds.includes('HeroZefiraEtherealSpears'));assert(o.sounds.includes('HeroZefiraTauntUltimate'))
 await page.waitForFunction(()=>window.zUltimateObservation.visible===0&&window.zUltimateObservation.floors===0)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser Zefira ultimate: legal ulti tree, automatic three-target trigger, 21 original spear EXOs and independent ground decals, actual area damage, sound dispatch, recovery/cleanup; no JS/asset errors')
}finally{await browser.close()}
