import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const withPops=process.argv.includes('--pops')
const read=p=>JSON.parse(readFileSync(p)),base=read('public/data/entities.json'),rows=read(withPops?'analysis/wizard-bolt-pops-oracle.json':'analysis/wizard-bolt-health-oracle.json'),failures=[]
const order=Object.entries(read('analysis/game-system-order.json').slots);assert(Number(order.find(([,name])=>name==='main_script')[0])<Number(order.find(([,name])=>name==='health')[0]),'fixture uses original main-script before health phase')
let frames=0
for(const row of rows){
 const c=row.case,templates=structuredClone(base),name=`bolt_tower_wizard_lvl${c.rank}`,b=templates[name].bullet
 // Original health-only fixtures disable native particles, including the second rank4 bolt.
 for(let rank=1;rank<=4;rank++)templates[`bolt_tower_wizard_lvl${rank}`].bullet.particles_name=undefined
 if(c.kind==='ignore-offset')b.ignore_hit_offset=true
 if(c.kind==='magic-penetration'){b.chance_to_ignore_mr=.5;b.reduce_magic_armor=.4}
 if(c.kind==='reverse-no-kill')templates[name].bullet.damage_type=4|8388608
 const enemy={id:123,name:'enemy_bandit',hp:40,template:structuredClone(templates.enemy_bandit),path:new PathFollower([{x:620,y:350},{x:1200,y:350}])}
 if(c.kind==='lethal-pop')enemy.hp=1
 if(c.kind==='magic-penetration')enemy.template.health.magic_armor=.5
 if(c.kind==='ignore-damage')enemy.template.health.ignore_damage=true
 if(c.kind==='immune-magic')enemy.template.health.immune_to=4
 let randomCalls=0,gold=0,kills=0
 const random=()=>{randomCalls++;return c.kind==='sequence'?[.9,.1,.8,.2][(randomCalls-1)%4]:c.roll??.25},combat=new RangedCombat(templates,random,()=>{gold+=5;kills++}),all=[],effects=[]
 if(withPops)combat.dodges=new DodgeSystem(random,templates)
 const push=combat.projectiles.push;combat.projectiles.push=function(...items){all.push(...items);return push.apply(this,items)}
 combat.onEffect=(name,pos,at)=>effects.push({at,name,pos:{...pos}})
 for(let hand=1;hand<=(c.kind==='two-lethal'||c.kind==='reverse-no-kill'?2:1);hand++){const rank=c.kind==='reverse-no-kill'&&hand===2?4:c.rank,shotName=`bolt_tower_wizard_lvl${rank}`,sign=-1,source={id:'wizard-source',tower:`tower_wizard_lvl${rank}`,pos:{x:500,y:350},damageFactor:c.kind==='two-lethal'&&hand===2?1.75:1};combat.wizardTowers.onShoot(source,shotName,{x:500+sign*25,y:405},{id:enemy.id,pos:enemy.path.position},sign,-1/30)}
 let mismatch
 for(const [tick,n]of row.frames.entries()){
  const t=tick*(1/30),kind=c.kind,ban=kind==='insert-ban'||kind==='ban-temporary'&&tick>=5&&tick<12||kind==='ban-impact'&&tick>=5
  enemy.template.vis.bans=ban?2:0;enemy.path.position.x=620+(kind==='moving'?tick*40/30:0)+(kind==='teleport-limit'&&tick>=4?128:kind==='teleport-outside'&&tick>=4?128.001:0)
  if((kind==='dead'||kind==='dead-revive')&&tick===5){enemy.hp=0;enemy.diedAt=t}
  if(kind==='dead-revive'&&tick===12){enemy.hp=40;enemy.diedAt=undefined}
  const removed=kind==='removed'&&tick>=5||kind==='removed-return'&&tick>=5&&tick<12
  combat.advance(t,[],removed?[]:[enemy])
  try{
   assert.equal(enemy.hp,n.hp,'health');assert.equal(enemy.diedAt!==undefined,n.dead,'death state');assert.equal(gold,n.gold,'gold');assert.equal(randomCalls,n.randomCalls,'random draw count')
   for(const [i,p]of n.shots.entries()){
    if(!p.accepted){assert.equal(all.length,0);continue}
    const w=all[i];assert(w);assert.equal(!w.done,p.active,'active');assert.equal(w.tracking,p.bound,'bound target')
    for(const key of ['x','y']){assert(Math.abs(w.pos[key]-p.pos[key])<1e-7,'position');assert(Math.abs(w.motion.velocity[key]-p.velocity[key])<1e-7,'velocity');assert(Math.abs(w.to[key]-p.to[key])<1e-7,'destination')}
   }
   frames++
  }catch(e){mismatch={rank:c.rank,kind:c.kind,roll:c.roll,tick,reason:e.message,actual:{hp:enemy.hp,gold,randomCalls},expected:{hp:n.hp,gold:n.gold,randomCalls:n.randomCalls}};break}
 }
 if(mismatch)failures.push(mismatch)
 else {assert(kills<=1);const nativeEffects=row.effects.filter(e=>!e.frame);assert.deepEqual(effects.map(e=>e.name),nativeEffects.map(e=>e.name));for(let i=0;i<effects.length;i++){assert(Math.abs(effects[i].at-nativeEffects[i].at)<1e-9);for(const key of ['x','y'])assert(Math.abs(effects[i].pos[key]-nativeEffects[i].pos[key])<1e-7)}}
 if(withPops&&!mismatch){const actual=combat.dodges.pops,expected=row.effects.filter(e=>e.frame);assert.equal(actual.length,expected.length,`${c.rank}/${c.kind} pop count`);for(const [i,p]of actual.entries()){const n=expected[i];assert(Math.abs(p.at-n.at)<1e-10);for(const axis of ['x','y'])assert(Math.abs(p.pos[axis]-n.pos[axis])<1e-7);assert.equal(p.frame,n.frame);assert(Math.abs(p.rotation-n.rotation)<1e-10)}}
}
if(failures.length){console.log(JSON.stringify(failures,null,2));throw Error(`${failures.length}/${rows.length} native wizard projectile/health traces differ`)}
console.log(`${withPops?'With original kill-gated damage pops: ':''}${rows.length} original wizard projectile+health traces / ${frames} frames match four ranks, moving/dead/removed/returning/banned targets, exact tracking cutoff, offsets, immunity, native random consumption/penetration and simultaneous lethal bolts; effects and single death reward verified`)
