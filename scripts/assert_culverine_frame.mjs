import assert from 'node:assert/strict'
export function assertCulverineFrame(g,f,ctx){
 let states=0
 const near=(a,b,label)=>assert(Math.abs(a-b)<1e-12,ctx+'/'+label)
 for(const {model:site}of g.entities.bindingsInOrder('tower')){
  if(!site.tower?.startsWith('tower_culverine_'))continue
  const state=g.combat.culverineTowers.states.get(site.id),n=f.entities.find(e=>e.id===g.entities.entity(site)?.id)
  if(!state||!n)continue
  assert.equal(state.attackAt,n.culverineAttackTs,ctx+'/attack clock')
  for(const [i,p]of state.parts.entries()){const q=n.culverineParts[i];assert.equal(p.name,q.name,ctx+'/part name '+i);assert.equal(p.ts,q.ts,ctx+'/part clock '+i);assert.equal(p.flip,q.flip_x,ctx+'/part flip '+i);assert.equal(p.hidden,!!q.hidden,ctx+'/part hidden '+i);assert.equal(p.loop,q.loop,ctx+'/part loop '+i)}
  states++
 }
 const c=g.combat.nativeCulverine
 assert.equal(c.rays.length,f.entities.filter(e=>/^bullet_culverine_lvl/.test(e.template)).length,ctx+'/ray collection')
 assert.equal(c.auras.size,f.entities.filter(e=>/^aura_bullet_culverine_lvl/.test(e.template)).length,ctx+'/aura collection')
 assert.equal(c.decals.size,f.entities.filter(e=>e.template==='fx_bullet_culverine_hit').length,ctx+'/decal collection')
 for(const m of c.rays){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/ray');assert.equal(m.born,n.spriteTs,ctx+'/ray clock');assert.equal(m.hidden,n.bullet.hidden,ctx+'/hidden');near(m.rotation,n.rotation,'rotation');for(const axis of ['x','y']){near(m.scale[axis],n.spriteScale[axis],'scale');near(m.pos[axis],n.pos[axis],'ray position');near(m.to[axis],n.bullet.to[axis],'ray endpoint')}states++}
 for(const m of c.decals){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/decal');assert.equal(m.born,n.spriteTs,ctx+'/decal clock');assert.equal(m.alpha,n.spriteAlpha,ctx+'/decal alpha');for(const axis of ['x','y'])near(m.pos[axis],n.pos[axis],'decal position');if(n.nativeTween){assert.equal(m.fading,!n.nativeTween.disabled,ctx+'/decal tween disabled');assert.equal(m.fading,!!n.nativeTween.reverse,ctx+'/decal tween reverse');if(n.nativeTween.ts!==undefined)assert.equal(m.tweenAt,n.nativeTween.ts,ctx+'/decal tween clock')}states++}
 for(const m of c.auras){const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/aura');assert.equal(m.sourceId,n.auraSource,ctx+'/source');assert.equal(m.factor,n.auraFactor,ctx+'/factor');assert.equal(m.level,n.auraLevel,ctx+'/level');for(const axis of ['x','y'])near(m.pos[axis],n.pos[axis],'payload position');states++}
 return states
}
