import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/native-firebook-burn-oracle.json');let frames=0
for(const row of rows){
 let tick=0,calls=0;const events=[],models=new WeakMap(),e={id:100,name:'enemy_bandit',hp:1000,template:structuredClone(templates.enemy_bandit),path:{position:{x:500,y:350}}},c=new RangedCombat(templates,()=>{calls++;return .25},()=>{}),burn=c.firebook.runtime
 c.firebook.native=true
 if(row.kind==='vis-ban')e.template.vis.bans|=16388;if(row.kind==='immune')e.template.health.immune_to=1;if(row.kind==='ignore')e.template.health.ignore_damage=true
 const record=(kind,e)=>events.push({tick,kind,id:e.id,name:e.template_name})
 const r=new NativeEntityRegistry(100,{onQueue:(e,inserting)=>record(inserting?'queueInsert':'queueRemove',e),onInsert:entity=>{const accepted=entity.template_name==='mod_firebook_aura'?burn.insert(entity.model,r.time):true;record(accepted?'insert':'insertRejected',entity);return accepted},onRemove:entity=>{if(entity.template_name==='mod_firebook_aura')burn.remove(entity.model);record('remove',entity);return true}})
 const allocate=(name,model)=>{const entity=r.create(id=>({id,template_name:name,model}));record('create',entity);if(model)models.set(model,entity);return entity}
 r.queueInsert(allocate('enemy_bandit',e));r.beginTick()
 burn.present=()=>!!r.entities.get(100)
 burn.candidates=target=>{const filtered=new LuaEntityTable();for(const entity of r.entities.values())if(entity.template_name==='mod_firebook_aura'&&entity.model.enemy===target)filtered.set(entity.id,entity.model);return [...filtered.values()]}
 burn.onQueue=m=>r.queueInsert(allocate('mod_firebook_aura',m));burn.onRemove=m=>r.queueRemove(models.get(m));c.onDamageCreate=()=>allocate('damage').id
 for(tick=1;tick<=row.frames.length;tick++){
  const kind=row.kind,level=row.level,n=row.frames[tick-1],ctx=`${level}/${kind}/${tick}`,add=rank=>c.firebook.queue(e,rank)
  if(tick===1)add(level)
  if(tick===31){if(kind==='refresh')add(level);else if(kind==='upgrade'&&level<3)add(level+1);else if(kind==='lower'&&level>1)add(level-1);else if(kind==='burst-up'){add(2);add(3)}else if(kind==='burst-mixed'){add(3);add(2);add(1)}else if(kind==='burst-refresh'){add(level);add(level)}}
  if(tick===121&&kind==='expiry-refresh')add(level)
  if(tick===61&&kind==='dead'){e.hp=0;e.diedAt=n.at}
  if(tick===61&&kind==='removed')r.queueRemove(models.get(e))
  r.beginTick()
  for(const entity of r.entities.values())if(entity.template_name==='mod_firebook_aura')burn.advance(entity.model,r.time)
  c.advance(r.time,[],r.entities.get(100)?[e]:[])
  assert.equal(e.hp,n.hp,ctx+'/HP');assert.equal(calls,n.calls,ctx+'/RNG');for(const key of ['nextId','count','max'])assert.equal(r[key],n[key],ctx+'/'+key)
  assert.deepEqual([...r.entities.values()].map(e=>e.id),n.ids,ctx+'/Lua table');assert.deepEqual(r.pendingInserts.map(e=>e.id),n.inserts,ctx+'/insert queue');assert.deepEqual(r.pendingRemovals.map(e=>e.id),n.removals,ctx+'/remove queue')
  const actual=[...r.entities.values()].filter(e=>e.template_name==='mod_firebook_aura').map(e=>({id:e.id,level:e.model.level,at:e.model.at,spriteAt:e.model.spriteAt,dpsTs:e.model.dpsTs,pos:e.model.pos}))
  assert.deepEqual(actual,n.burns,ctx+'/registered burns');frames++
 }
 assert.deepEqual(events,row.events,`${row.level}/${row.kind}/complete entity events`)
}
console.log(`${rows.length} original native firebook traces/${frames} frames match actual create/queue/insert/reject/remove events, IDs/table/queues, own-main positions/clocks, damage/RNG, rank replacement/bursts and expiry-boundary refresh`)
