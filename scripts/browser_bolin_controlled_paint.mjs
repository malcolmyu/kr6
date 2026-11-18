import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync} from 'node:fs'
import {readPreciseJson as read} from './read_precise_json.mjs'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const driverVersion=createHash('sha256').update(readFileSync('scripts/bolin_chain_inputs.mjs')).update(readFileSync('scripts/bolin_a_chain_inputs.mjs')).update(readFileSync('scripts/bolin_b_chain_inputs.mjs')).digest('hex')
const scenario=process.argv[2]??'bolin-base',mode=process.argv[3]??'normal'
const n=read(`analysis/level-entity-bootstrap-3-campaign-cleared-${scenario}-runtime-lcg104.json`),paint=read(`analysis/native-controlled-paint-${scenario}.json`),art=read('public/data/towers-art.json')
assert.deepEqual(paint.missing,[]);assert.deepEqual(paint.missingAnimations,[]);assert.deepEqual(paint.metadata,{tick:n.frames.at(-1).tick,random:n.randomDraws.length,events:n.events.length,nextId:n.nextId});assert.equal(paint.samples.length,n.frames.length)
const families=['hero_bolin','fx_bullet_bolin','fx_bolin_bullet_casing','ps_bullet_bolin_casing',...(n.profileOverrides.heroUpgrades.hero_bolin.includes('skill_a')?['bullet_bolin_skill_a','fx_aura_bolin_skill_a_slow','decal_bolin_crater','ps_bullet_bolin_skill_a']:[]),...(/^bolin-b(?:-|$)/.test(scenario)?['bullet_bolin_skill_b','aura_bolin_skill_b_trigger','decal_bolin_crater']:[]),...(n.profileOverrides.heroUpgrades.hero_bolin.includes('skill_c')?['bullet_bolin_skill_c','fx_bullet_bolin_skill_c']:[])]
for(const sample of paint.samples)for(const f of sample.frames)if(families.includes(f.name)&&f.key.includes(':sprite:')){
 if(f.exo){const def=art.exos[f.prefix],frame=def.animations.find(a=>a.name===f.animation)?.frames[f.spriteFrame-1];assert(frame,`Original Bolin EXO ${f.prefix}/${f.animation}/${f.spriteFrame}`);f.expectedParts=frame.map((p,i)=>({part:i,atlas:def.parts[p[1]-1][0],alpha:p[2]*(f.alpha??255)/255})).filter(p=>p.alpha>0)}
 else if(f.name==='decal_bolin_crater')f.expectedAtlas=f.animation
 else{const a=art.animations[`${f.prefix}_${f.animation}`];assert(a);f.expectedAtlas=`${a.prefix}_${String(a.from+f.spriteFrame-1).padStart(4,'0')}`}
}
const frames=n.frames.map(f=>({tick:f.tick,nextId:f.nextId,count:f.count,max:f.max,random:f.randomBoundary,inserts:f.inserts.join(','),removals:f.removals.join(',')})),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(p=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3},3:{campaign:3,iron:true}},onboarding:{stage1:true,stage2:true,comic2:true},heroes:p.heroXp,heroUpgrades:p.heroUpgrades,powerXp:p.powerXp,globalUpgrades:p.globalUpgrades})),n.profileOverrides)
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async({profile,playerLevel,frames,driverVersion,scenario})=>{
  const resources=performance.getEntriesByType('resource'),get=name=>import(resources.find(r=>r.name.includes('/src/game/'+name+'.ts')).name),{WorldRenderer}=await get('WorldRenderer'),{GameSession}=await get('GameSession'),{AtlasSprite}=await get('SpriteAtlas'),load=WorldRenderer.prototype.load,advance=GameSession.prototype.advance,step=GameSession.prototype.step,setFrame=AtlasSprite.prototype.setFrame
  const {driveBolinChain}=await import(`/scripts/bolin_chain_inputs.mjs?fixture=${driverVersion}`);const {driveBolinMortarChain}=await import(`/scripts/bolin_a_chain_inputs.mjs?fixture=${driverVersion}`);const {driveBolinMinesChain}=await import(`/scripts/bolin_b_chain_inputs.mjs?fixture=${driverVersion}`);window.driveBolinChain=/^bolin-b(?:-|$)/.test(scenario)?driveBolinMinesChain:scenario.startsWith('bolin-a')?driveBolinMortarChain:driveBolinChain;window.paintIsolateSkills=profile.isolateBolinSkills;window.paintAdvance=advance;window.paintFrames=frames;window.paintChecked=0
  AtlasSprite.prototype.setFrame=function(name,...args){this.mesh.userData.observedAtlas=name;return setFrame.call(this,name,...args)}
  GameSession.prototype.advance=function(){}
  GameSession.prototype.step=function(dt){step.call(this,dt);if(this!==window.paintWorld?.session)return;const f=window.paintFrames[this.tick-1],r=this.entities.registry;for(const key of ['nextId','count','max'])if(r[key]!==f[key])throw Error(`Chrome controlled ${this.tick}/${key}: ${r[key]} != ${f[key]}`);if(window.paintDraws!==f.random||r.pendingInserts.map(e=>e.id).join(',')!==f.inserts||r.pendingRemovals.map(e=>e.id).join(',')!==f.removals)throw Error(`Chrome controlled RNG/queues ${this.tick}: ${JSON.stringify({actualRandom:window.paintDraws,expectedRandom:f.random,inserts:r.pendingInserts.map(e=>e.id),expectedInserts:f.inserts,removals:r.pendingRemovals.map(e=>e.id),expectedRemovals:f.removals,bolin:this.heroes.team.filter(h=>h.name==='hero_bolin').map(h=>({hp:h.hp,visual:h.visualOverride,idle:h.idleVisual,control:this.heroes.bolin.states.get(h)?.phase}))})}`);window.paintChecked++}
  WorldRenderer.prototype.load=async function(...args){
   if(args[0]!==3)return load.apply(this,args)
   let seed=104;window.paintDraws=0;this.sessionRandom=()=>{window.paintDraws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};window.paintWorld=this
   await load.call(this,3,'campaign',true,true,false,profile.heroXp,playerLevel,['reinforcements','rain_of_fire','royal_edict'],profile.heroUpgrades,['archers','knights','catapult','wizard','culverine'],{stage1:true,stage2:true},profile.powerXp,profile.powerUpgrades??{},profile.globalUpgrades,['hero_bolin','hero_zefira'])
   const render=this.renderer.render.bind(this.renderer);this.renderer.render=(...args)=>{render(...args);window.paintRenderedTick=this.session.tick}
  }
 },{profile:n.profileOverrides,playerLevel:n.playerLevel,frames,driverVersion,scenario})
 await page.getByRole('button',{name:'3. 遭受入侵的农田',exact:true}).click();await waitForGame(page);await page.waitForFunction(()=>window.paintWorld?.session?.tick===0)
 let matched=0,matchedEffects=0;const counts={}
 for(const sample of paint.samples){
  await page.evaluate(({tick,mode})=>{const g=window.paintWorld.session;while(g.tick<tick){window.driveBolinChain(g,g.tick+1,mode,window.paintIsolateSkills);window.paintAdvance.call(g,1/30)}},{tick:sample.tick,mode})
  await page.waitForFunction(tick=>window.paintRenderedTick===tick,sample.tick)
  const result=await page.evaluate(({frames,families})=>{
   const w=window.paintWorld,g=w.session,originals=new Map(frames.map(f=>[f.key,f])),seen=new Set(),seenParts=new Set();let previous=-1,matched=0,effects=0;const counts={}
   for(const item of w.renderer.renderLists.get(w.scene,0).transparent){const k=item.object.userData.nativePaint;if(!k?.key)continue;const f=originals.get(k.key);if(!f)throw Error(`Missing actual original frame ${g.tick}/${k.key}`);for(const key of ['x','y','z','draw'])if(Math.abs(k[key]-f[key])>1e-7)throw Error(`Original paint metadata ${g.tick}/${f.name}/${key}: ${k[key]} != ${f[key]}`)
    if(families.includes(f.name)){
     if(['bullet_bolin_skill_a','fx_aura_bolin_skill_a_slow','bullet_bolin_skill_b','aura_bolin_skill_b_trigger','decal_bolin_crater'].includes(f.name)&&f.position){const root=f.exo?w.scene.getObjectById(k.group):item.object.parent;for(const axis of ['x','y']){if(Math.abs(root.position[axis]-f.position[axis]-(f.offset?.[axis]??0))>1e-10||Math.abs(root.scale[axis]-(f.scale?.[axis]??1))>1e-12)throw Error(`Original mortar transform ${g.tick}/${f.name}/${axis}: ${JSON.stringify({position:root.position[axis],expectedPosition:f.position[axis],offset:f.offset?.[axis],scale:root.scale[axis],expectedScale:f.scale?.[axis]})}`)}}
     if(f.name==='bullet_bolin_skill_c'){const root=item.object.parent;if(Math.abs(root.rotation.z-(f.rotation??0))>1e-12||Math.abs(root.scale.x-(f.scale?.x??1))>1e-12||Math.abs(root.scale.y-(f.scale?.y??1))>1e-12)throw Error(`Original ray transform ${g.tick}/${f.key}`);if(f.hidden)throw Error(`Hidden original ray was submitted ${g.tick}/${f.key}`)}
     const part=f.expectedParts?.find(p=>p.part===k.part),expected=part?.atlas??f.expectedAtlas??f.atlasFrame
     if(expected&&item.object.userData.observedAtlas!==expected)throw Error(`Original atlas ${g.tick}/${f.name}: ${item.object.userData.observedAtlas} != ${expected}`)
     if(part)seenParts.add(k.key+':'+k.part)
     const opacity=part?.alpha??(f.alpha??255)/255
     if(Math.abs(item.object.material.opacity-opacity)>1e-7)throw Error(`Original opacity ${g.tick}/${f.name}`)
     effects++;counts[f.name]=(counts[f.name]??0)+1
    }
    if(seen.has(k.key))continue;seen.add(k.key);if(f.index<previous)throw Error(`Original scene order ${g.tick}/${f.name}`);previous=f.index;matched++
   }
   for(const f of frames)if(families.includes(f.name)&&!f.hidden&&(f.alpha??255)>0){if((!f.expectedParts||f.expectedParts.length)&&!seen.has(f.key))throw Error(`Missing visible original family ${g.tick}/${f.name}/${f.key}`);for(const p of f.expectedParts??[])if(!seenParts.has(f.key+':'+p.part))throw Error(`Missing actual EXO part ${g.tick}/${f.name}/${p.part}`)}
   return{matched,effects,counts}
  },{frames:sample.frames,families})
  matched+=result.matched;matchedEffects+=result.effects;for(const [name,count]of Object.entries(result.counts))counts[name]=(counts[name]??0)+count
  if((/^bolin-b(?:-|$)/.test(scenario)?[210,242,281,451,460]:scenario.startsWith('bolin-a')?[526,544,562,590,720]:[102,133,205]).includes(sample.tick))await page.screenshot({path:`analysis/web-controlled-paint-${scenario}-${sample.tick}.png`})
 }
 assert.equal(await page.evaluate(()=>window.paintChecked),n.frames.length);for(const name of families){const visible=paint.samples.some(s=>s.frames.some(f=>f.name===name&&!f.hidden&&(f.alpha??255)>0&&(!f.expectedParts||f.expectedParts.length)));if(visible)assert(counts[name]>0,name);else assert.equal(counts[name]??0,0,`No original visible ${name}`)}assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 assert.deepEqual(await page.evaluate(()=>window.paintWorld.session.entities.events.map(({tick,id,kind,template})=>({tick,id,kind,template}))),n.events.map(({tick,id,kind,template})=>({tick,id,kind,template})))
 const result={scenario,ticks:n.frames.length,paintCheckpoints:paint.samples.length,matchedSceneFrames:matched,matchedEffectFrames:matchedEffects,families:counts};writeFileSync(`analysis/browser-controlled-paint-${scenario}.json`,JSON.stringify(result,null,2)+'\n');console.log(result)
}finally{await browser.close()}
