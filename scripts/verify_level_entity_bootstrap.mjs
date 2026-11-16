import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
import {bootstrapLevelEntities} from '../src/game/LevelEntityBootstrap.ts'
const read=path=>JSON.parse(readFileSync(path))
let cases=0,allocations=0,filtered=0
const inputs=[]
for(let stage=1;stage<=3;stage++)for(const mode of ['campaign','iron'])for(const profile of ['default','entry','cleared'])inputs.push({stage,mode,profile,variant:'normal'})
for(const variant of ['restarted','skip-cutscenes','zefira-first','zefira-only'])inputs.push({stage:2,mode:'campaign',profile:'entry',variant})
for(const {stage,mode,profile,variant}of inputs){
 const stem=`analysis/level-entity-bootstrap-${stage}-${mode}-${profile}${variant==='normal'?'':'-'+variant}`,native=read(stem+'.json'),defaults=read(stem+'-templates.json'),level=read(`public/data/level0${stage}.json`).data,modeNumber=mode==='campaign'?1:3
 const team=variant==='zefira-first'?['hero_zefira','hero_gerald']:variant==='zefira-only'?['hero_zefira']:profile==='cleared'||profile==='entry'&&stage>1?['hero_gerald','hero_zefira']:['hero_gerald']
 const events=[],registry=new NativeEntityRegistry(1,{onQueue:(e,inserting)=>events.push({kind:inserting?'queueInsert':'queueRemove',id:e.id,template:e.template})})
 const create=registry.create.bind(registry)
 registry.create=factory=>{const e=create(factory);events.push({kind:'create',id:e.id,template:e.template});return e}
 const items=level.level_mode_overrides?.[modeNumber]?.entities_list??level.entities_list
 const result=bootstrapLevelEntities(registry,items,defaults,{stage,mode:modeNumber,team,campaignComplete:profile==='cleared',restarted:variant==='restarted',skipCutscenes:variant==='skip-cutscenes'})
 const context=`${stage}/${mode}/${profile}/${variant}`
 assert.deepEqual(events,native.events,context+'/native allocation and queue events')
 assert.equal(registry.nextId,native.nextId,context+'/next ID')
 assert.deepEqual(registry.pendingInserts.map(({id,template})=>({id,template})),native.pending,context+'/pending insertion order')
 assert.equal(result.manualHeroInsertion,native.manualHeroInsertion,context+'/manual hero insertion')
 registry.beginTick()
 assert.deepEqual([...registry.entities.values()].map(({id,template})=>({id,template})),native.queueOnlyFlush,context+'/native queue-only entity table iteration')
 allocations+=events.filter(e=>e.kind==='create').length;filtered+=result.mapEntities.filter(e=>!registry.entities.get(e.id)).length;cases++
}
console.log(`${cases} original level bootstrap cases: ${allocations} allocations, ${filtered} unqueued map objects still consuming IDs; map/deck/tutorial prefix and queue-only Lua table flush match. Full game insertion hooks are outside this test.`)
