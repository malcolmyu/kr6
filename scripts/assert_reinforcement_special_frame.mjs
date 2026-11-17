import assert from 'node:assert/strict'
import {soldierIsDead} from '../src/game/SoldierHealth.ts'
export function assertReinforcementSpecialFrame(g,f,ctx){
  for(const m of g.reinforcementSpecial.models){
   const n=f.entities.find(e=>e.id===g.entities.entity(m)?.id);assert(n,ctx+'/special registered model')
   for(const axis of ['x','y'])assert(Math.abs(m.pos[axis]-n.pos[axis])<1e-7,ctx+'/special position')
   if(m.kind==='aura'){assert.equal(m.at,n.auraTs,ctx+'/special aura clock');assert.equal(m.sourceId,n.auraSource,ctx+'/special aura source')}
   if(m.kind==='damage'||m.kind==='armor'){
    for(const [key,value]of [['modifierTs',m.at],['modifierSource',m.sourceId],['modifierTarget',m.targetId],['modifierLevel',m.level],['modifierDuration',m.duration]])assert.equal(value,n[key],ctx+'/special '+key)
   }
   if(m.kind==='armor'){
    assert.equal(m.spriteAt,n.spriteTs,ctx+'/special sprite clock');assert.equal(m.alpha,n.spriteAlpha,ctx+'/special alpha')
    for(const [key,value]of [['disabled',m.disabled],['reverse',m.reverse],['remove',m.removeTween]])assert.equal(value,!!n.nativeTween[key],ctx+'/special tween '+key)
    if(n.nativeTween.ts!==undefined)assert.equal(m.tweenAt,n.nativeTween.ts,ctx+'/special tween clock')
   }
  }
  assert.equal(g.reinforcementSpecial.models.size,f.entities.filter(e=>['decal_power_reinforcements_special','aura_power_reinforcement_special','mod_reinforcement_special_damage','mod_reinforcement_special_armor'].includes(e.template)).length,ctx+'/special collection')
  for(const {model:s}of g.entities.bindingsInOrder('soldier')){
   const n=f.entities.find(e=>e.id===g.entities.entity(s)?.id);if(!n)continue
   for(const axis of ['x','y'])assert(Math.abs(s.pos[axis]-n.pos[axis])<1e-7,ctx+'/all soldier position')
   if(s.expiresAt!==undefined){assert.equal(soldierIsDead(s),n.healthDead,ctx+'/all reinforcement dead');assert.equal(!!s.healthBarHidden,!!n.barHidden,ctx+'/all reinforcement health bar')}
   if(s.name==='soldier_reinforcement_special'&&s.visualOverride){assert.equal(s.visualOverride.name,n.animation,ctx+'/special body animation');assert.equal(s.visualOverride.at,n.spriteTs,ctx+'/special body clock');assert.equal(s.visualOverride.loop??false,n.spriteLoop,ctx+'/special body loop')}
   assert.equal(s.hp,n.hp,ctx+'/all soldier HP');assert.equal(s.template.health.armor,n.armor,ctx+'/all soldier armor')
   assert.equal(s.template.health.raw_armor,n.rawArmor,ctx+'/all soldier raw armor');assert.equal(s.template.unit?.damage_factor,n.unitDamageFactor,ctx+'/all soldier damage factor')
  }
 return g.reinforcementSpecial.models.size
}
