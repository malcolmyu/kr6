import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {selectDefaultSlot,waitForGame} from './browser_helpers.mjs'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.setDefaultTimeout(45000)
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack)});page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
 await page.addInitScript(()=>localStorage.setItem('kingdom-rush-6.progress.v1',JSON.stringify({levels:{1:{campaign:3},2:{campaign:3}}})))
 await page.route('**/data/level01-campaign.json',route=>route.fulfill({json:{format:'tsv',commands:[{name:'gold',value:5000},{name:'lives',value:20},{name:'wave',wait_time:-1},{name:'wait',wait_time:9999}]}}))
 await page.goto('http://127.0.0.1:5173/?debug=1');await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.getByRole('button',{name:'点击开始',exact:true}).click();await selectDefaultSlot(page);await waitForGame(page)
 await page.evaluate(async()=>{
  const resources=performance.getEntriesByType('resource'),get=async name=>import(resources.find(r=>r.name.includes(`/src/game/${name}.ts`)).name),{GameSession}=await get('GameSession'),{WorldRenderer}=await get('WorldRenderer'),{PathFollower}=await get('PathFollower'),advance=GameSession.prototype.advance,render=WorldRenderer.prototype.renderTowers
  WorldRenderer.prototype.renderTowers=function(){render.call(this);window.particleWorld=this}
  GameSession.prototype.advance=function(dt){
   if(!window.particleFixture){
    const templates=this.templates,h=this.heroes.insert('hero_zefira',{x:480,y:350},this.time),template=structuredClone(templates.enemy_bandit)
    template.motion.max_speed=0;template.health.hp_max=5000;h.pos={x:480,y:350};h.rally={...h.pos};h.readyAt=-9
    const enemy={id:999,name:'enemy_bandit',hp:5000,born:this.time,age:0,template,frozen:true,path:new PathFollower([{x:610,y:390},{x:900,y:390}])};this.enemies.push(enemy)
    const create=this.heroes.ranged.onParticleCreate;window.particleQueue=[]
    this.heroes.ranged.onParticleCreate=(name,time,p)=>{create(name,time,p);const entity=this.entities.registry.pendingInserts.at(-1);window.particleQueue.push({name,time,pending:!!entity&&!this.entities.registry.entities.get(entity.id)});this.combat.catapultTowers.onShoot({id:'particle-fixture',tower:'tower_catapult_lvl1'},'bullet_catapult_lvl1',{x:500,y:300},{x:650,y:420},1,time,0)}
    window.particleFixture={game:this,hero:h}
   }
   advance.call(this,dt)
   if(!window.particleCaptured&&this.heroes.ranged.trails.trails.some(t=>t.particles.length>=4)&&this.combat.firebookTrails.trails.some(t=>t.kind==='catapult'&&t.particles.length)){
    window.particleCaptured=true;this.paused=true;window.particleFixture.hero.scriptLocked=true
   }
  }
 })
 try{await page.waitForFunction(()=>window.particleCaptured&&window.particleWorld?.firebookRenderer.trailSprites.size>0)}catch(e){console.log(await page.evaluate(()=>{const f=window.particleFixture,g=f?.game,h=f?.hero;return{captured:window.particleCaptured,world:!!window.particleWorld,time:g?.time,paused:g?.paused,hero:h&&{pos:h.pos,moving:h.moving,deploying:h.deploying,locked:h.scriptLocked,ready:h.readyAt,ranged:h.rangedUntil,target:h.target?.id},queue:window.particleQueue,projectiles:g?.heroes.ranged.projectiles.length,trails:g?.heroes.ranged.trails.trails.map(t=>({at:t.at,count:t.particles.length})),tower:g?.combat.firebookTrails.trails.map(t=>({kind:t.kind,count:t.particles.length}))}}));throw e}
 const state=await page.evaluate(()=>{
  const {game:g}=window.particleFixture,w=window.particleWorld,t=g.heroes.ranged.trails.trails[0],p=t.particles[0],art=w.firebookRenderer.trailSprites.get(`hero:${p.id}`),tower=g.combat.firebookTrails.trails.find(t=>t.kind==='catapult').particles[0],other=w.firebookRenderer.trailSprites.get(tower.id)
  return{queue:window.particleQueue,frame:p.frame,pos:p.pos,rotation:p.rotation,alpha:p.alpha,scale:p.scale,ids:[p.id,tower.id],distinct:art!==other,render:art&&{visible:art.root.visible,pos:{x:art.root.position.x,y:art.root.position.y},rotation:art.root.rotation.z,alpha:art.mesh.material.opacity,scale:{x:art.root.scale.x,y:art.root.scale.y}}}
 })
 assert.equal(state.queue.length,1);assert(state.queue[0].pending);assert.equal(state.queue[0].name,'ps_bullet_zefira');assert.match(state.frame,/^hero_zefira_attack_particle_000[123]$/);assert.deepEqual(state.ids,[1,1]);assert(state.distinct,'hero/tower particle IDs must not share a rendered sprite');assert(state.render?.visible)
 assert.deepEqual(state.render.pos,state.pos);assert.deepEqual(state.render.scale,state.scale);assert.equal(state.render.rotation,state.rotation);assert.equal(state.render.alpha,state.alpha/255)
 await page.screenshot({path:'analysis/web-zefira-native-particles.png'})
 await page.evaluate(()=>{const {game:g}=window.particleFixture;g.paused=false;for(let i=0;i<100;i++)g.advance(1/30);g.paused=true})
 await page.waitForFunction(()=>!window.particleWorld.firebookRenderer.trailSprites.size)
 const cleanup=await page.evaluate(()=>({trails:window.particleFixture.game.heroes.ranged.trails.trails.length,registered:[...window.particleFixture.game.entities.registry.entities.values()].filter(e=>e.template==='ps_bullet_zefira').length}))
 assert.deepEqual(cleanup,{trails:0,registered:0});assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log('Browser controlled empty-wave fixture: hero emitter queues before insertion; original particle atlas frames, position/rotation/material alpha/scale render correctly alongside tower particle ID1; lingering particles, renderer and registry all clean up. No page/asset errors; no video/audio equivalence claim.')
}finally{await browser.close()}
