import assert from 'node:assert/strict'
export function assertThrottleFrame(g,f,ctx){
 let states=0
 for(const {model:site}of g.entities.bindingsInOrder('tower')){
  if(!site.tower?.startsWith('tower_culverine'))continue
  const state=g.combat.culverineTowers.states.get(site.id),n=f.entities.find(e=>e.id===g.entities.entity(site)?.id)
  if(!state||!n)continue
  for(const [i,a]of state.timedAttacks.entries())for(const key of ['ts','bullet','cooldown','disabled','shots','rate_of_fire'])assert.equal(a[key],n.culverineTimedAttacks[i][key],ctx+'/timed '+i+'/'+key)
  if(site.tower==='tower_culverine_lvl4')assert.equal(site.powerLevels?.skill_c??0,n.powerC??0,ctx+'/C rank')
 }
 assert.equal(g.throttle.models.size,f.entities.filter(e=>e.template.startsWith('fx_culverine_skill_c_buff')).length,ctx+'/C buff collection')
 for(const m of g.throttle.models){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/registered C buff');assert.equal(m.name,n.template);assert.deepEqual(m.pos,n.pos,ctx+'/C buff position');assert.equal(m.spriteAt,n.spriteTs,ctx+'/C sprite clock');assert.equal(m.tweenAt,n.nativeTween.ts,ctx+'/C tween clock');assert.equal(m.disabled,!!n.nativeTween.disabled,ctx+'/C tween disabled');assert.equal(m.fading,!!n.nativeTween.reverse,ctx+'/C reverse');assert.equal(m.alpha,n.spriteAlpha,ctx+'/C opacity');states++}
 return states
}
