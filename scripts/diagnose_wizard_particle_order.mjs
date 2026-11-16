import {readFileSync,writeFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=p=>JSON.parse(readFileSync(p)),base=read('public/data/entities.json'),results=[]
for(const row of read('analysis/wizard-bolt-paired-sequence-oracle.json')){
 let calls=0,gold=0;const random=()=>{calls++;return [.9,.1,.8,.2,.7,.3,.6,.4][(calls-1)%8]},c=new RangedCombat(base,random,()=>gold+=5),e={id:123,hp:40,template:structuredClone(base.enemy_bandit),path:new PathFollower([{x:620,y:350},{x:1200,y:350}])},all=[]
 c.dodges=new DodgeSystem(random,base);const push=c.projectiles.push;c.projectiles.push=function(...items){all.push(...items);return push.apply(this,items)}
 for(let i=0;i<2;i++)c.wizardTowers.onShoot({id:'source',tower:`tower_wizard_lvl${row.rank}`,pos:{x:500,y:350},damageFactor:i?1.75:1},`bolt_tower_wizard_lvl${row.rank}`,{x:475,y:405},{id:e.id,pos:e.path.position},-1,0)
 const mismatches=[];let firstParticle
 for(const [i,n]of row.frames.entries()){
  c.advance((row.birth+i+1)*(1/30),[],[e])
  if(e.hp!==n.hp||gold!==n.gold||calls!==n.calls)mismatches.push({tick:i+1,actual:{hp:e.hp,gold,calls},native:{hp:n.hp,gold:n.gold,calls:n.calls}})
  if(!firstParticle)for(const t of n.trails.filter(t=>t.active)){const actual=c.firebookTrails.trails.find(a=>a.sourceId===all[t.source-1]?.id);for(let j=0;j<t.particles.length;j++)if(actual?.particles[j]&&Math.abs(actual.particles[j].lifetime-t.particles[j].lifetime)>1e-10){firstParticle={tick:i+1,source:t.source,actual:actual.particles[j].lifetime,native:t.particles[j].lifetime,nativeIteration:n.particleOrder};break}}
 }
 results.push({rank:row.rank,birth:row.birth,nativeIds:row.nativeIds,firstParticle,firstGameplayDifference:mismatches[0],gameplayMismatchFrames:mismatches.length})
}
writeFileSync('analysis/wizard-particle-order-diagnostic.json',JSON.stringify({note:'Diagnostic of an unresolved multi-entity ordering gap, not a passing acceptance test. Original entity_db.filter_iter uses Lua next; production still uses queue order.',results},null,2))
console.log(JSON.stringify(results))
