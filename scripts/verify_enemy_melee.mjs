import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {EnemyMelee} from '../src/game/EnemyMelee.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
import {damageSoldier} from '../src/game/SoldierHealth.ts'
import {nativeAnimationFrame} from '../src/game/NativeAnimation.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),level=read('public/data/level03.json'),counts=read('public/data/enemy-melee-frames.json'),rows=read('analysis/enemy-melee-oracle.json')
let frames=0
for(const row of rows){
 let calls=0,tick=row.birth;const random=()=>{calls++;return .25},dodges=new DodgeSystem(random,templates),units=row.initial.units.map((pos,i)=>({id:i+1,name:'soldier_knights_lvl1',pos:{...pos},template:structuredClone(templates.soldier_knights_lvl1),dodge:structuredClone(templates.soldier_knights_lvl1.dodge),hp:10000,moving:(row.scenario===7||row.scenario===13)&&i===0,motionArrived:!((row.scenario===7||row.scenario===12)&&i===0),lastHitAt:-Infinity})),path=new EnemyPath(level.paths.paths,level.navigation,1,1)
 path.ni=100;Object.assign(path.position,row.initial.pos)
 const e={id:10,name:row.name,born:row.birth*(1/30),template:structuredClone(templates[row.name]),path,hp:10000};delete e.template.ranged
 let blockers=[units[0]],queue=[];const events=[],controller=new EnemyMelee(random,()=>blockers,dodges)
 controller.onDamage=(source,target,attack,value)=>queue.push({source,target,attack,value})
 controller.onEffect=name=>events.push({tick,kind:'effect',name});controller.onSound=name=>events.push({tick,kind:'sound',name})
 for(let relative=1;relative<=240;relative++){
  tick=row.birth+relative;const time=tick*(1/30),n=row.frames[relative-1],context=`${row.name}/${row.birth}/${row.scenario}/tick${tick}`
  if(row.scenario===2&&relative===35||row.scenario===3&&relative===40||row.scenario===4&&relative===50||row.scenario===5&&relative===100||row.scenario===9&&relative===50)blockers=[]
  if(row.scenario===5&&relative===150)blockers=[units[0]]
  if(row.scenario===6&&relative===40)blockers=[units[1]]
  if(row.scenario===7&&relative===10||row.scenario===12&&relative===50){units[0].moving=false;units[0].motionArrived=true}
  if(row.scenario===8)e.template.unit.is_stunned=relative>=45&&relative<65
  controller.advance(e,time)
  for(const hit of queue)events.push({tick,kind:'damage',target:`s${hit.target.id}`,value:hit.value})
  for(const hit of queue.toReversed())damageSoldier(hit.target,{value:hit.value,damage_type:hit.attack.damage_type},time)
  if(row.scenario>=9&&relative===({9:35,10:40,11:50})[row.scenario])damageSoldier(units[0],{value:100000,damage_type:2},time)
  for(const hit of queue)dodges.showDamage(e,hit.target,time,hit.attack.pop,hit.attack.pop_chance,hit.attack.pop_conds,1)
  queue=[]
  if(!e.meleeHolding){path.advance((1/30)*e.template.motion.max_speed);controller.walk(e)}
  const state=controller.states.get(e);let sprite=e.visualOverride
  if(!sprite){const config=e.template.render.sprites[0],angle=(Math.atan2(path.direction.y,path.direction.x)*180/Math.PI+360)%360,[a,b,c,d]=config.angles_custom.walk,index=angle>a&&angle<b?1:angle>c&&angle<d?2:0;sprite={name:config.angles.walk[index],at:state.sprite.at,loop:true}}
  assert(Math.hypot(path.position.x-n.pos.x,path.position.y-n.pos.y)<1e-8,context+'/position');assert.equal(path.ni,n.ni,context+'/ni')
  assert.equal(sprite.name,n.animation,context+'/animation');assert.equal(sprite.at,n.ts,context+'/sprite ts');assert.equal(sprite.loop,n.loop,context+'/loop');assert.equal(state.ts,n.attackTs,context+'/attack ts')
  assert.equal(nativeAnimationFrame(counts[e.template.render.sprites[0].prefix][sprite.name],time-sprite.at,sprite.loop,30).frame+1,n.frame,context+'/frame')
  assert.deepEqual(units.map(s=>s.hp),n.hp,context+'/hp');assert.equal(calls,n.calls,context+'/RNG');frames++
 }
 assert.deepEqual(events,row.events,`${row.name}/${row.birth}/${row.scenario}/events`)
}
console.log(`${rows.length} original full enemy main-script cases / ${frames} frames match retained targets, cooldown/hit waits, attack/idle/walking atlas frames, path, HP, RNG, hit effects, blocker changes and stun continuations; ranged disabled in this fixture`)
