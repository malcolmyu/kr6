import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ArcherRangeSystem} from '../src/game/ArcherRange.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),oracles=read('analysis/archers-range-oracle.json')
let frames=0
for(const oracle of oracles){const c=oracle.case,system=new ArcherRangeSystem(templates),sites=[],all=new Map(),sounds=[]
 const add=(id,tower,x,y)=>{const s={id,tower:tower.startsWith('tower_holder')?undefined:tower,holder:'tower_holder_terrain_1_1',pos:{x,y},rally:{x,y},terrain:1,spent:0,...(c.initialRangeFactor?{rangeFactor:c.initialRangeFactor}:{})};sites.push(s);all.set(id,s);return s}
 const source=add('source','tower_archers_lvl4',500,350);source.powerLevels={skill_b:c.startLevel};if(c.secondLevel){add('second','tower_archers_lvl4',550,350).powerLevels={skill_b:c.secondLevel}}
 add('wizard','tower_wizard_lvl1',600,350);add('archers','tower_archers_lvl1',500,450);add('knights','tower_knights_lvl1',550,350);add('culverine','tower_culverine_lvl1',650,350);add('edgeX','tower_wizard_lvl1',755,350);add('edgeY','tower_catapult_lvl1',500,535);add('far','tower_wizard_lvl1',850,350);add('holder','tower_holder_terrain_1_1',450,350);add('unmodifiable','tower_wizard_lvl1',480,350).canBeMod=false
 // The original fixture's entity iteration order is supplied; global SSO/main-script ordering is a separate unfinished concern.
 const order=[...new Set(oracle.queued.filter(q=>q.name==='mod_archers_skill_b_range').map(q=>q.source))];sites.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):-1)-(order.includes(b.id)?order.indexOf(b.id):-1))
 system.onSound=name=>sounds.push({at:time,name});let time=0
 for(let relative=1;relative<=c.frames;relative++){
  time=(c.birth+relative)*(1/30)
  for(const event of c.events.filter(e=>e.tick===relative)){
   if(event.power)source.powerLevels.skill_b=event.power
   if(event.preview!==undefined)source.powerPreview=event.preview?'skill_b':undefined
   if(event.blocked!==undefined)source.towerBlocked=event.blocked
   if(event.sell){const site=all.get(event.sell);sites.splice(sites.indexOf(site),1);site.tower=undefined}
   if(event.upgrade)all.get(event.upgrade).tower='tower_wizard_lvl2'
   if(event.newTower)add('new','tower_wizard_lvl1',700,350)
  }
  system.advance(time,sites);const native=oracle.frames[relative-1],context=`${c.name}/frame${relative}`
  for(const [id,range]of Object.entries(native.ranges)){const site=all.get(id),t=templates[site.tower??site.holder],value=(t.attacks?.range??t.barrack?.rally_range??0)*(site.rangeFactor??1);assert(Math.abs(value-range)<1e-8,`${context}/${id}: range ${value}/${range}`)}
  const mods=[...system.buffs.values()].map(b=>({source:b.source.id,target:b.target.id,level:b.level,factor:b.factor,at:b.at,spriteAt:b.spriteAt,tweenAt:b.tweenAt})).sort((a,b)=>a.target.localeCompare(b.target))
  const expected=native.mods.filter(m=>sites.includes(all.get(m.target))).map(m=>({source:m.source,target:m.target,level:m.level,factor:m.factor,at:m.at,spriteAt:m.sprites[0].ts,tweenAt:m.tweenAt})).sort((a,b)=>a.target.localeCompare(b.target))
  assert.equal(mods.length,expected.length,context+'/buff count')
  for(let i=0;i<mods.length;i++)for(const key of Object.keys(mods[i])){if(typeof mods[i][key]==='number')assert(Math.abs(mods[i][key]-expected[i][key])<1e-9,`${context}/${mods[i].target}/${key}: ${mods[i][key]}/${expected[i][key]}`);else assert.equal(mods[i][key],expected[i][key],context+'/'+key)}
  for(const mod of native.mods){assert(Math.abs(mod.sprites[0].alpha-Math.min(255,Math.max(0,(time-mod.tweenAt)/.5*255)))<1e-7,context+'/buff alpha')}
  for(const preview of native.previews){assert(Math.abs(preview.alpha-Math.min(255,Math.max(0,(time-preview.at)/.5*255)))<1e-7,context+'/preview alpha')}
  const previews=system.previews.filter(p=>p.at!==undefined).map(p=>({x:p.target.pos.x,y:p.target.pos.y,ox:p.offset.x,oy:p.offset.y,at:p.at})).sort((a,b)=>a.x-b.x||a.y-b.y),nativePreviews=native.previews.map(p=>({x:p.pos.x,y:p.pos.y,ox:p.offset.x,oy:p.offset.y,at:p.at})).sort((a,b)=>a.x-b.x||a.y-b.y)
  assert.equal(previews.length,nativePreviews.length,context+'/preview count');for(let i=0;i<previews.length;i++)for(const key of Object.keys(previews[i]))assert(Math.abs(previews[i][key]-nativePreviews[i][key])<1e-9,context+'/preview '+key)
  const eagles=system.eagles.filter(e=>e.started!==undefined);assert.equal(eagles.length,native.eagles.length,context+'/eagles');for(const e of eagles){const n=native.eagles.find(n=>n.pos.x===e.source.pos.x);assert.equal(e.draw,n.draw,context+'/eagle order')}
  frames++
 }
 assert.equal(sounds.length,oracle.sounds.length,c.name+'/sounds');for(let i=0;i<sounds.length;i++){assert.equal(sounds[i].name,oracle.sounds[i].name);assert(Math.abs(sounds[i].at-oracle.sounds[i].at)<1e-9,c.name+'/sound time')}
}
console.log(`${frames} original simulation/tower/modifier frames match: three levels/births, strict cooldowns, upgrades, strongest-source ownership, source sale, target upgrade, new targets, previews, eagles and blocking; fixture entity order isolated`)
