import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
import {bootstrapLevelEntities} from '../src/game/LevelEntityBootstrap.ts'
import {insertLevelEntity} from '../src/game/LevelEntityInsertion.ts'
import {NativePersistentEntities} from '../src/game/NativePersistentEntities.ts'
const read=path=>JSON.parse(readFileSync(path)),inputs=[]
for(let stage=1;stage<=3;stage++)for(const mode of ['campaign','iron'])for(const profile of ['default','entry','cleared'])inputs.push({stage,mode,profile,variant:'normal'})
for(const variant of ['restarted','skip-cutscenes','zefira-first','zefira-only'])inputs.push({stage:2,mode:'campaign',profile:'entry',variant})
let creations=0,rejections=0,callbacks=0
for(const {stage,mode,profile,variant}of inputs){
 const stem=`analysis/level-entity-bootstrap-${stage}-${mode}-${profile}${variant==='normal'?'':'-'+variant}-insertion`,native=read(stem+'.json'),defaults=read(stem+'-templates.json'),level=read(`public/data/level0${stage}.json`).data,modeNumber=mode==='campaign'?1:3
 const team=variant==='zefira-first'?['hero_zefira','hero_gerald']:variant==='zefira-only'?['hero_zefira']:profile==='cleared'||profile==='entry'&&stage>1?['hero_gerald','hero_zefira']:['hero_gerald']
 const events=[],rejected=[],indexes=new NativePersistentEntities();let registry
 registry=new NativeEntityRegistry(1,{onQueue:(e,inserting)=>events.push({kind:inserting?'queueInsert':'queueRemove',id:e.id,template:e.template}),onInsert:e=>{if(!insertLevelEntity(registry,e,defaults))return false;return indexes.insert(e)},onRemove:e=>indexes.remove(e),onDequeue:(e,inserting)=>{assert.equal(inserting,true);rejected.push({id:e.id,template:e.template})}})
 const create=registry.create.bind(registry);registry.create=factory=>{const e=create(factory);events.push({kind:'create',id:e.id,template:e.template});return e}
 const items=level.level_mode_overrides?.[modeNumber]?.entities_list??level.entities_list
 bootstrapLevelEntities(registry,items,defaults,{stage,mode:modeNumber,team,campaignComplete:profile==='cleared',restarted:variant==='restarted',skipCutscenes:variant==='skip-cutscenes'})
 const context=`${stage}/${mode}/${profile}/${variant}`
 assert.deepEqual(registry.pendingInserts.map(({id,template})=>({id,template})),native.pending,context+'/before insertion')
 registry.beginTick()
 assert.deepEqual(events,native.events,context+'/native creation, nested queue, and removal events')
 assert.equal(registry.nextId,native.nextId,context+'/next ID')
 assert.deepEqual([...registry.entities.values()].map(({id,template})=>({id,template})),native.insertedEntities,context+'/actual table after insertion callbacks')
 assert.deepEqual(rejected,native.callbackEvents.filter(e=>e.result===false||e.result==='nil').map(({id,template})=>({id,template})),context+'/rejected insertion')
 assert.equal(registry.count,native.count,context+'/count');assert.equal(registry.max,native.max,context+'/max')
 assert.equal(registry.pendingInserts.length,0);assert.equal(registry.pendingRemovals.length,0)
 assert.deepEqual(native.cloneEvents,[],context+'/original first flush does not clone')
 assert.deepEqual(Object.fromEntries([...indexes.lists].map(([name,list])=>[name,[...list.values()].map(e=>e.id)])),native.persistentLists,context+'/actual SSO persistent-list indexes and order')
 assert.equal(native.systemOrder[4],'sso');assert.equal(native.systemOrder[13],'power_xp_tracking');assert.equal(native.systemOrder[24],'sso_post')
 creations+=events.filter(e=>e.kind==='create').length;rejections+=rejected.length;callbacks+=native.callbackEvents.length
}
console.log(`${inputs.length} native first-insertion cases (${callbacks} original callbacks): ${creations} creations, ${rejections} rejected flags, tutorial tower replacement, three queued chess controllers, exact table order/count/max/next ID and SSO persistent lists match. Health/render/RNG and SSO spatial grids are separate.`)
