import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ArcherRangeSystem} from '../src/game/ArcherRange.ts'
import {RangedCombat} from '../src/game/RangedCombat.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read(process.argv.includes('--abc')?'analysis/archers-abc-cast-oracle.json':process.argv.includes('--ac')?'analysis/archers-ac-cast-oracle.json':'analysis/archers-pierce-cast-oracle.json');let checked=0
for(const {level,birth,kind,actions,aPurchaseTick,cPurchaseTick,cUpgradeTick,upgradeTick,frames,events:expected}of rows.filter(r=>!process.argv.includes('--legacy-range-phase')||r.kind==='abc-same')){
 const site={id:'test',tower:'tower_archers_lvl4',pos:{x:500,y:350},powerLevels:{skill_a:0}},pool=[[600,400],[650,360],[570,350]].map(([x,y],i)=>({id:i+1,hp:1000,template:structuredClone(templates.enemy_bandit),path:{position:{x,y},direction:{x:1,y:0},remainingNodes:100+i,finished:false}})),c=new RangedCombat(templates,()=>.5,()=>{}),caster=c.archerPierceCaster,events=[]
 c.archerMarkCaster.onEagle=name=>events.push({tick,name});c.archerMarkCaster.onMark=(_enemy,level)=>events.push({tick,name:'mod_archers_skill_c_weak',modifierLevel:level,...(actions?{modifierTarget:_enemy.id}:{})});c.onSound=sound=>events.push({tick,sound});
 let range
 if(actions){
  const wizard={id:'wizard',tower:'tower_wizard_lvl1',pos:{x:600,y:350}},sites=[site,wizard];if(kind==='no-target'){site.canBeMod=false;wizard.canBeMod=false}
  range=new ArcherRangeSystem(templates);range.deferSources=true
  range.onSound=sound=>events.push({tick,sound});range.onCast=(_s,time)=>{c.shooters.get(site.id).archerTs=time}
  range.onQueueEagle=()=>events.push({tick,name:'decal_archers_skill_b_eagle'})
  range.onQueueBuff=b=>events.push({tick,name:'mod_archers_skill_b_range',modifierLevel:b.level,rangeFactor:b.factor,modifierTarget:b.target===site?'source':'wizard'})
  if(process.argv.includes('--legacy-range-phase')){range.legacySites=sites;range.deferSources=false}else{c.onArcherPowerUpdates=(site,time)=>range.syncUpgrades(site,time);c.onArcherRangeMain=(site,time)=>range.advanceSource(site,time,sites)}
 }
 c.deferArcherControllers=true;c.predictTarget=e=>({pos:e.path.position,valid:true});let tick
 caster.onSound=sound=>events.push({tick,sound})
 caster.onShot=({name,from,to,target,min,max,factor,flight})=>events.push({tick,name,from,to,target:target.id,min,max,factor,flight})
 for(const [i,f]of frames.entries()){
  const relative=i+1;tick=f.tick;const time=tick*(1/30)
  for(const action of actions??[])if(action.tick===relative)site.powerLevels[action.power]=action.level
  if(!actions&&relative===(aPurchaseTick??20))site.powerLevels.skill_a=level
  if(relative===cPurchaseTick)site.powerLevels.skill_c=1
  if(relative===cUpgradeTick)site.powerLevels.skill_c=2
  if(kind==='upgrade'&&relative===25&&level<3)site.powerLevels.skill_a=level+1
  if(relative===upgradeTick)site.powerLevels.skill_a=level+1
  site.towerBlocked=kind==='blocked-source'&&relative>=15&&relative<75||(kind==='blocked'&&relative>=15&&relative<75)||(kind==='blocked-cast'&&relative>=25&&relative<75)
  for(const [j,e]of pool.entries()){
   e.hp=kind==='lost'&&relative>=25?0:1000
   if(kind==='moving')e.path.position.x=600+(j+1)*20+relative*.01
   if(kind==='left')e.path.position.x=400-(j+1)*20
   if(kind==='opposite')e.path.position.x=j===1?400:600+(j+1)*20
   if(kind==='banned')e.template.vis.bans=4194304
  }
  const available=flags=>pool.filter((e,j)=>!(kind==='empty'||kind==='late'&&relative<80||kind==='empty-release'&&relative>=40||kind==='single'&&j>0||kind==='removed'&&relative>=25)&&e.hp>0&&!(e.template.vis.bans&flags))
  if(range?.legacySites)range.advance(time,range.legacySites)
  c.advance(time,[site],available(2))
  const current=c.shooters.get(site.id),ctx=`${level}/${birth}/${kind}/${relative}`
  if(relative>=20){assert.equal(current.archerTs,f.basicTs,ctx+'/basic');assert.equal(caster.states.get(site.id)?.ts??0,f.pierceTs,ctx+'/pierce');assert.deepEqual([...current.archers.values()].map(child=>{const value=child.pending;child.pending=false;return value}),f.children,ctx+'/children')}
  if(relative<20)for(const child of current.archers.values())child.pending=false
  if(f.rangeTs!==undefined)assert.equal(range.states.get(site.id)?.ts??0,f.rangeTs,ctx+'/B timestamp')
  if(f.markTs!==undefined)assert.equal(c.archerMarkCaster.states.get(site.id)?.ts??0,f.markTs,ctx+'/mark timestamp')
  for(const [index,sid]of templates.tower_archers_lvl4.shooters_sids.entries()){const child=current.archers.get(sid);if(child.animation==='stun')assert.deepEqual({name:child.animation,ts:child.startedAt,flip:child.flipX,loop:child.loop},f.parts[index],ctx+'/sprite'+index)}
  checked++
 }
 assert.equal(events.length,expected.length,`${kind}/events`)
 for(let i=0;i<events.length;i++){
  const a=events[i],b=expected[i];assert.deepEqual({...a,from:undefined,flight:undefined},{...b,from:undefined,flight:undefined},`${level}/${birth}/${kind}/event${i}`)
  if(a.from){assert.ok(Math.abs(a.flight-b.flight)<1e-12);assert.ok(Math.abs(a.from.x-b.from.x)<1e-9);assert.ok(Math.abs(a.from.y-b.from.y)<1e-9)}
 }
}
console.log(`${rows.length} original Archer A/B/C tower cases / ${checked} frames: front shooter selection, sounds, captured/reselected targets, side filtering, duplicate shots, geometry, damage, upgrades and basic/skill clocks match`)
