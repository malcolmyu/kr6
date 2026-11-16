import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
import {HeroLifeRuntime} from '../src/game/HeroLifeRuntime.ts'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),rows=read('analysis/hero-life-oracle.json'),templates=read('public/data/entities.json');let frames=0,tombs=0
for(const row of rows){
 const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),templates,()=>.5,'iron');applyStageSetup(g,3,'iron',true,true)
 const h=g.heroes.team.find(h=>h.name===row.name),life=new HeroLifeRuntime(),events=[],sounds=[],models=new WeakMap(),registry=new NativeEntityRegistry(1,{onQueue:(e,inserting)=>events.push({tick:registry.tick,kind:inserting?'queueInsert':'queueRemove',template:e.template}),onInsert:e=>events.push({tick:registry.tick,kind:'insert',template:e.template}),onRemove:e=>{events.push({tick:registry.tick,kind:'remove',template:e.template});life.remove(e.model);return true}});registry.tick=row.birth
 h.hp=0;h.template.health.hp_max=200;h.template.health.dead_lifetime=row.lifetime;h.facingLeft=true;h.ignoreDamage=false;h.visualOverride={name:'idle',at:row.birth/30,loop:true};Object.assign(h.pos,{x:500,y:350});let completed=false
 life.onQueue=m=>{const e=registry.create(id=>({id,template:m.name,model:m}));models.set(m,e);registry.queueInsert(e)};life.onRemove=m=>registry.queueRemove(models.get(m));life.onRelease=h=>{h.target=undefined};life.onSound=name=>sounds.push({tick:registry.tick,name})
 for(const f of row.frames){registry.beginTick();const time=f.tick*(1/30);if(!completed){life.advance(h,time);completed=h.hp>0}for(const e of registry.entities.values())life.tween(e.model,time)
  const context=`${row.name}/${row.birth}/${row.lifetime}/${f.tick}`,pose=h.visualOverride??h.idleVisual;assert.equal(h.hp,f.hp,context+'/HP');assert.equal(h.hp<=0,f.dead,context+'/dead');assert.equal(!!h.ignoreDamage,f.ignore,context+'/damage immunity');assert.equal(h.deathFinishedAt,f.finished,context+'/death finished');assert.equal(h.lifeCanClick,f.canClick,context+'/click');assert.equal(pose.name,f.animation,context+'/animation');assert.equal(pose.at,f.at,context+'/clock');assert.equal(pose.loop,f.loop,context+'/loop');assert.equal(completed,f.done,context+'/completion')
  const live=[...registry.entities.values()].map(e=>e.model);assert.equal(live.length,f.tomb?1:0,context+'/registered tomb');if(f.tomb){const m=live[0];tombs++;assert.equal(m.name,f.tomb.name);assert.deepEqual(m.pos,f.tomb.pos);assert.equal(m.pos,h.pos,'tomb position is original shared reference');assert.equal(m.at,f.tomb.at,context+'/tomb clock');assert.equal(m.facingLeft,f.tomb.flip);assert.equal(m.alpha,f.tomb.alpha,context+'/tomb alpha');assert.equal(m.tweenAt===undefined,f.tomb.tweenDisabled,context+'/tomb tween enabled');if(!f.tomb.tweenDisabled)assert.equal(m.tweenAt,f.tomb.tweenAt)}frames++
 }
 assert.deepEqual(events,row.events,`${row.name}/${row.birth}/${row.lifetime}/complete lifecycle events`);assert.deepEqual(sounds,row.sounds);assert(completed);assert.equal(life.tombs.length,0)
}
console.log(`${rows.length} original full hero life traces/${frames} frames/${tombs} registered tomb states: death/finish, concurrent grave, exact30/20-second wait, respawn animation/immunity/full HP, sounds and actual insert/tween/removal event order match`)
