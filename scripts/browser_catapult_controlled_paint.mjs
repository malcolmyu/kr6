import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const scenario=process.argv[2]??'catapult-native-area-c-trigger',skill=process.argv[3]??'skill_c',rank=Number(process.argv[4]??1),mode=process.argv[5]??'trigger'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),n=read(`analysis/level-entity-bootstrap-3-campaign-cleared-${scenario}-runtime-lcg104.json`),paint=read(`analysis/native-controlled-paint-${scenario}.json`),art=read('public/data/towers-art.json')
assert.deepEqual(paint.missing,[]);assert.deepEqual(paint.missingAnimations,[]);assert.deepEqual(paint.metadata,{tick:n.frames.at(-1).tick,random:n.randomDraws.length,events:n.events.length,nextId:n.nextId});assert.equal(paint.samples.length,n.frames.length)
const families=skill==='skill_a'?['aura_catapult_skill_a']:skill==='skill_b'?['aura_catapult_skill_b_bomb']:['aura_catapult_skill_c_trap','mod_catapult_skill_c_stun']
for(const sample of paint.samples)for(const f of sample.frames)if(families.includes(f.name)){const a=art.animations[`${f.prefix}_${f.animation}`];assert(a);f.expectedAtlas=`${a.prefix}_${String(a.from+f.spriteFrame-1).padStart(4,'0')}`}
const frames=n.frames.map(f=>({tick:f.tick,nextId:f.nextId,count:f.count,max:f.max,random:f.randomBoundary,inserts:f.inserts.join(','),removals:f.removals.join(',')})),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(p=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3},3:{campaign:3,iron:true}},onboarding:{stage1:true,stage2:true,comic2:true},heroes:p.heroXp,heroUpgrades:p.heroUpgrades,powerXp:p.powerXp,globalUpgrades:p.globalUpgrades})),n.profileOverrides)
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async({profile,playerLevel,frames})=>{
  const resources=performance.getEntriesByType('resource'),get=name=>import(resources.find(r=>r.name.includes('/src/game/'+name+'.ts')).name),{WorldRenderer}=await get('WorldRenderer'),{GameSession}=await get('GameSession'),{AtlasSprite}=await get('SpriteAtlas'),load=WorldRenderer.prototype.load,advance=GameSession.prototype.advance,step=GameSession.prototype.step,setFrame=AtlasSprite.prototype.setFrame
  const {driveCatapultChain}=await import('/scripts/catapult_chain_inputs.mjs');window.driveCatapultChain=driveCatapultChain;window.paintAdvance=advance;window.paintFrames=frames;window.paintChecked=0
  AtlasSprite.prototype.setFrame=function(name,...args){this.mesh.userData.observedAtlas=name;return setFrame.call(this,name,...args)}
  GameSession.prototype.advance=function(){}
  GameSession.prototype.step=function(dt){step.call(this,dt);if(this!==window.paintWorld?.session)return;const f=window.paintFrames[this.tick-1],r=this.entities.registry;for(const key of ['nextId','count','max'])if(r[key]!==f[key])throw Error(`Chrome controlled ${this.tick}/${key}: ${r[key]} != ${f[key]}`);if(window.paintDraws!==f.random||r.pendingInserts.map(e=>e.id).join(',')!==f.inserts||r.pendingRemovals.map(e=>e.id).join(',')!==f.removals)throw Error(`Chrome controlled RNG/queues ${this.tick}`);window.paintChecked++}
  WorldRenderer.prototype.load=async function(...args){
   if(args[0]!==3)return load.apply(this,args)
   let seed=104;window.paintDraws=0;this.sessionRandom=()=>{window.paintDraws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};window.paintWorld=this
   await load.call(this,3,'campaign',true,true,false,profile.heroXp,playerLevel,['reinforcements','rain_of_fire','royal_edict'],profile.heroUpgrades,['archers','knights','catapult','wizard','culverine'],{stage1:true,stage2:true},profile.powerXp,profile.powerUpgrades??{},profile.globalUpgrades)
   const render=this.renderer.render.bind(this.renderer);this.renderer.render=(...args)=>{render(...args);window.paintRenderedTick=this.session.tick}
  }
 },{profile:n.profileOverrides,playerLevel:n.playerLevel,frames})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.paintWorld?.session?.tick===0)
 let matched=0,matchedEffects=0;const counts={}
 for(const sample of paint.samples){
  await page.evaluate(({tick,rank,mode,skill})=>{const g=window.paintWorld.session;while(g.tick<tick){window.driveCatapultChain(g,g.tick+1,rank,mode,skill);window.paintAdvance.call(g,1/30)}},{tick:sample.tick,rank,mode,skill})
  await page.waitForFunction(tick=>window.paintRenderedTick===tick,sample.tick)
  const result=await page.evaluate(({frames,families})=>{
   const w=window.paintWorld,g=w.session,originals=new Map(frames.map(f=>[f.key,f])),seen=new Set();let previous=-1,matched=0,effects=0;const counts={}
   for(const item of w.renderer.renderLists.get(w.scene,0).transparent){const k=item.object.userData.nativePaint;if(!k?.key)continue;const f=originals.get(k.key);if(!f)throw Error(`Missing actual original frame ${g.tick}/${k.key}`);for(const key of ['x','y','z','draw'])if(Math.abs(k[key]-f[key])>1e-7)throw Error(`Original paint metadata ${g.tick}/${f.name}/${key}: ${k[key]} != ${f[key]}`)
    if(families.includes(f.name)){if(item.object.userData.observedAtlas!==f.expectedAtlas)throw Error(`Original atlas ${g.tick}/${f.name}: ${item.object.userData.observedAtlas} != ${f.expectedAtlas}`);if(Math.abs(item.object.material.opacity-(f.alpha??255)/255)>1e-7)throw Error(`Original opacity ${g.tick}/${f.name}`);effects++;counts[f.name]=(counts[f.name]??0)+1}
    if(seen.has(k.key))continue;seen.add(k.key);if(f.index<previous)throw Error(`Original scene order ${g.tick}/${f.name}`);previous=f.index;matched++
   }
   for(const f of frames)if(families.includes(f.name)&&!f.hidden&&(f.alpha??255)>0&&!seen.has(f.key))throw Error(`Missing visible original family ${g.tick}/${f.name}/${f.key}`)
   return{matched,effects,counts}
  },{frames:sample.frames,families})
  matched+=result.matched;matchedEffects+=result.effects;for(const [name,count]of Object.entries(result.counts))counts[name]=(counts[name]??0)+count
  if([400,414,431].includes(sample.tick))await page.screenshot({path:`analysis/web-controlled-paint-${scenario}-${sample.tick}.png`})
 }
 assert.equal(await page.evaluate(()=>window.paintChecked),n.frames.length);for(const name of families)assert(counts[name]>0,name);assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 assert.deepEqual(await page.evaluate(()=>window.paintWorld.session.entities.events.map(({tick,id,kind,template})=>({tick,id,kind,template}))),n.events.map(({tick,id,kind,template})=>({tick,id,kind,template})))
 const result={scenario,ticks:n.frames.length,paintCheckpoints:paint.samples.length,matchedSceneFrames:matched,matchedEffectFrames:matchedEffects,families:counts};writeFileSync(`analysis/browser-controlled-paint-${scenario}.json`,JSON.stringify(result,null,2)+'\n');console.log(result)
}finally{await browser.close()}
