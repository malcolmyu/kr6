import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {loadingSwordPose} from '../src/game/LoadingSword.ts'
import {SceneTransitionController} from '../src/game/SceneTransitionController.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/scene-transition.json'),sizes={off:data.images.loading_asst_sword_off,on:data.images.loading_asst_sword_on,shine:data.images.asst_shine,mask:data.images.asst_handle_sword}
function close(a,b,path=''){if(typeof a==='number')assert(Math.abs(a-b)<1e-8,`${path}: ${a}/${b}`);else if(a&&typeof a==='object'){for(const key of Object.keys(b))close(a[key],b[key],path+'.'+key)}else assert.equal(a,b,path)}
for(const row of read('analysis/loading-sword-oracle.json')){
 const pose=loadingSwordPose(sizes,row.progress,row.scale,true,510.5,386,row.debug);close(pose,row.filled)
 close(loadingSwordPose(sizes,row.progress,row.scale,false,510.5,386,row.debug),row.opening)
 close(loadingSwordPose(sizes,row.progress,row.scale,false,510.5,386,row.debug).clip.pos,row.before)
}
assert.equal(data.exo.animations.find(a=>a.name==='doors_in').frames.length,22);assert.equal(data.exo.animations.find(a=>a.name==='doors_out').frames.length,23)
function fixture(){let now=0,next=0;const pending=new Map(),events=[];const c=new SceneTransitionController({now:()=>now,requestFrame:fn=>{pending.set(++next,fn);return next},cancelFrame:id=>pending.delete(id),visible:value=>events.push({at:now,visible:value}),pose:(phase,age,p)=>events.push({at:now,phase,age,p}),sound:name=>events.push({at:now,name})})
 return {c,events,async step(){now+=1000/30;const entries=[...pending.values()];pending.clear();for(const fn of entries)fn(now);for(let i=0;i<8;i++)await Promise.resolve()},get now(){return now},get pending(){return pending.size}}
}
{
 const f=fixture();let preparedAt;const run=f.c.run(async report=>{preparedAt=f.now;report(.5,.5)})
 assert.equal(await f.c.run(async()=>assert.fail('duplicate transition must not prepare')),false)
 for(let i=0;i<24;i++)await f.step()
 assert(Math.abs(preparedAt-23/30*1000)<1e-7)
 for(let i=0;i<23;i++)await f.step()
 assert.equal(await run,true);assert.equal(f.c.busy,false);assert.equal(f.pending,0)
 assert.deepEqual(f.events.filter(e=>e.name).map(e=>e.name),['GUITransitionClose','GUITransitionOpen'])
 assert(f.events.some(e=>e.phase==='loading'&&e.p===.5));assert.equal(f.events.at(-1).visible,false)
}
for(const when of ['closing','loading']){
 const f=fixture();let resolvePrepare,prepared=false
 const run=f.c.run(async()=>{prepared=true;await new Promise(resolve=>resolvePrepare=resolve)})
 if(when==='loading'){for(let i=0;i<23;i++)await f.step();const last=f.events.at(-1).age;await f.step();await f.step();assert(f.events.at(-1).age>last);assert.equal(f.pending,1)}
 f.c.cancel();assert.equal(await run,false);assert.equal(prepared,when==='loading');assert.equal(f.pending,0);assert.equal(f.c.busy,false)
 resolvePrepare?.();for(let i=0;i<8;i++)await Promise.resolve();assert.equal(f.events.filter(e=>e.name==='GUITransitionOpen').length,0)
}
{
 const f=fixture(),run=f.c.run(async()=>{throw new Error('resource fixture failure')});const observed=assert.rejects(run,/resource fixture failure/)
 for(let i=0;i<24;i++)await f.step();await observed;assert.equal(f.c.busy,false);assert.equal(f.events.at(-1).visible,false)
}
console.log('56 original loading-sword geometry/reveal/opening cases match; native22/23-frame EXOs, deferred preparation, image/audio progress, input ownership, cancellation, duplicate suppression and resource failure cleanup verified')
