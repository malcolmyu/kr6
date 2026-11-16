import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {HeroLifeRuntime} from '../src/game/HeroLifeRuntime.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/native-survivor-life-oracle.json')
let frames=0
for(const row of rows){
 const b=new BarracksCombat(templates,()=>.5,()=>{}),heroes=new HeroSystem(templates,b),h=heroes.insertGerald({x:500,y:350},row.birth/30),s=heroes.survivor,life=new HeroLifeRuntime(),events=[]
 let tick=row.birth
 h.nativeHeroLife=true;h.healthBarHidden=false;s.native=true;s.configure(['skill_c',...(row.level>=2?['upg_sc1']:[]),...(row.level===3?['upg_sc2']:[])])
 const target={id:200,hp:row.targetState==='dead'?0:100};h.target=row.targetState==='missing'?undefined:target
 s.onSound=name=>events.push({tick,sound:name});s.onNativeEffect=(name,pos)=>events.push({tick,name,sharedPos:pos===h.pos});s.onTeleport=enemy=>events.push({tick,name:'mod_gerald_skill_c_teleport',target:enemy.id,sharedPos:false})
 life.onSound=name=>events.push({tick,sound:name});life.onRelease=hero=>{hero.target=undefined}
 for(const f of row.frames){
  tick=f.tick;const time=tick*(1/30);s.beginNativeMain(time)
  if(h.hp<=0||s.active){if(!s.advanceNative(time,h))life.advance(h,time)}
  // The isolated original replaces melee/GoBack/regen and reaches its ordinary
  // soldier_idle continuation immediately after either death helper returns.
  if(h.hp>0&&!s.active&&!life.states.has(h)){const at=h.idleVisual?.at??0;h.idleVisual={name:'idle',at,loop:true}}
  if(tick-row.birth===6||row.again&&tick-row.birth===82){h.hp=0;h.deathHealthAt=time;h.diedAt=time}
  const pose=h.visualOverride??h.idleVisual??{name:'idle',at:0,loop:true},ctx=`level${row.level}/birth${row.birth}/${row.targetState}/again${row.again}/tick${tick}`
  for(const [key,value]of Object.entries({hp:h.hp,dead:h.hp<=0,ignore:!!h.ignoreDamage,xp:h.xpQueued,name:pose.name,ts:pose.at,loop:pose.loop??false,click:h.lifeCanClick??true,hidden:!!h.healthBarHidden}))assert.equal(value,f[key],ctx+'/'+key)
  frames++
 }
 assert.deepEqual(events,row.events.map(({source,...event})=>event),`Original survivor request stream ${JSON.stringify({level:row.level,birth:row.birth,targetState:row.targetState,again:row.again})}`)
}
console.log(`${rows.length} original survivor death-branch traces / ${frames} frames match raw clocks, death/ignore/click/HP/XP/animation and decal/modifier/sound requests, including cooldown fallback after a second lethal packet`)
