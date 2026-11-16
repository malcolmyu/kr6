import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {WizardTowerSystem} from '../src/game/WizardTower.ts'
import {WizardEmpowerSystem} from '../src/game/WizardEmpower.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),times=read('public/data/wizard-exo-times.json'),oracles=read('analysis/wizard-empower-oracle.json');let frames=0
for(const oracle of oracles){const c=oracle.case,system=new WizardTowerSystem(templates,times,()=>.25),buffs=new WizardEmpowerSystem(templates),sites=[],known=new Map(),enemies=[],sounds=[],shots=[]
 system.empower=buffs;let time=0;system.onSound=name=>sounds.push({at:time,name});system.onShoot=(site,name,from,target,sign,at)=>shots.push({at,name,from:{...from},to:{...target.pos}})
 const add=(id,tower,x,y)=>{const s={id,tower:tower.startsWith('tower_holder')?undefined:tower,holder:'tower_holder_terrain_1_1',pos:{x,y},spent:0,...(c.initialFactor?{damageFactor:c.initialFactor}:{})};sites.push(s);known.set(id,s);return s}
 const source=add('source','tower_wizard_lvl4',500,350);source.powerLevels={skill_a:c.fireLevel??0,skill_b:c.level};if(c.initialRangeFactor)source.rangeFactor=c.initialRangeFactor
 const second=c.secondLevel?add('second','tower_wizard_lvl4',550,350):undefined
 if(!c.noTargets){add('archers','tower_archers_lvl1',600,350);add('knights','tower_knights_lvl1',550,400);add('wizard','tower_wizard_lvl1',650,350);add('culverine','tower_culverine_lvl1',500,440);add('edge','tower_catapult_lvl1',695,362);add('far','tower_wizard_lvl1',800,350);add('extended','tower_archers_lvl1',750,362);add('holder','tower_holder_terrain_1_1',450,350);add('blocked','tower_wizard_lvl1',480,350).towerBlocked=true;add('unmodifiable','tower_wizard_lvl1',490,350).canBeMod=false;add('immune','tower_archers_lvl1',500,300).vis={flags:0,bans:4100}}
 const enemy=()=>enemies.push({hp:5000,path:{position:{x:c.enemyX??(c.basic?600:750),y:c.enemyY??350},finished:false}});if(!c.noEnemy)enemy()
 for(let tick=1;tick<=c.frames;tick++){
  for(const a of c.events.filter(a=>a.tick===tick)){
   if(a.power){source.powerLevels.skill_b=a.power;source.powerPreview=undefined}
   if(a.secondPower)second.powerLevels={skill_b:a.secondPower}
   if(a.preview!==undefined)source.powerPreview=a.preview?'skill_b':undefined
   if(a.blocked!==undefined)source.towerBlocked=a.blocked
   if(a.sell){const s=known.get(a.sell);sites.splice(sites.indexOf(s),1);s.tower=undefined}
   if(a.newTower)add('new','tower_archers_lvl1',600,350)
   if(a.enemy)enemy()
   if(a.upgrade)known.get('wizard').tower='tower_wizard_lvl2'
  }
  time=(c.birth+tick)*(1/30);buffs.advance(time,sites,enemies);system.advance(time,sites,()=>c.basic?[{id:'enemy',pos:enemies[0].path.position}]:[],[source,...(second?[second]:[])].filter(s=>sites.includes(s)))
  const row=oracle.frames[tick-1],ctx=c.name+'/frame'+tick
  for(const [key,value]of Object.entries(row.factors))assert(Math.abs((known.get(key).damageFactor??1)-value)<1e-8,ctx+`/${key}/factor ${known.get(key).damageFactor}/${value}`)
  if(sites.includes(source)){const s=system.states.get(source.id);assert.equal(s.loading,row.loading,ctx+'/loading');for(const [a,b,name]of [[s.ts,row.attackTs,'attackTs'],[s.buffTs,row.buffTs,'buffTs'],[s.bobTime,row.bobTime,'bobTime']])assert(Math.abs(a-b)<1e-9,ctx+`/${name} ${a}/${b}`);for(let i=0;i<s.parts.length;i++){const p=s.parts[i],n=row.parts[i];for(const k of ['name','flip','loop'])assert.equal(p[k],n[k],ctx+`/part${i}/${k}`);for(const [a,b,name]of [[p.ts,n.ts,'ts'],[p.offset.x,n.offset.x,'x'],[p.offset.y,n.offset.y,'y']])assert(Math.abs(a-b)<1e-8,ctx+`/part${i}/${name} ${a}/${b}`)}}
  if(second){const s=system.states.get(second.id);for(const [a,b,name]of [[s.ts,row.secondAttackTs,'attackTs'],[s.buffTs,row.secondBuffTs,'buffTs']])assert(Math.abs(a-b)<1e-9,ctx+'/second/'+name);for(let i=0;i<s.parts.length;i++){const p=s.parts[i],n=row.secondParts[i];assert.equal(p.name,n.name,ctx+'/second/sprite');assert(Math.abs(p.ts-n.ts)<1e-8,ctx+'/second/sprite ts')}}
  const actual=[...buffs.buffs.values()].map(b=>({source:b.source.id,target:b.target.id,level:b.level,factor:b.factor,at:b.at,duration:b.duration})).sort((a,b)=>a.target.localeCompare(b.target)),expected=row.effects.filter(e=>e.name==='mod_wizard_skill_b'&&sites.includes(known.get(e.target))).map(e=>({source:e.source,target:e.target,level:e.level,factor:e.factor,at:e.at,duration:e.duration})).sort((a,b)=>a.target.localeCompare(b.target));assert.equal(actual.length,expected.length,ctx+'/buff count');for(let i=0;i<actual.length;i++)for(const k of Object.keys(actual[i]))if(typeof actual[i][k]==='number')assert(Math.abs(actual[i][k]-expected[i][k])<1e-8,ctx+`/mod${i}/${k}`);else assert.equal(actual[i][k],expected[i][k],ctx+`/mod${i}/${k}`)
  const visuals=buffs.visuals.filter(v=>v.started!==undefined).map(v=>({name:v.kind==='fx'?'mod_wizard_skill_b_fx':v.kind==='decal'?'decal_tower_wizard_skill_b':'decal_tower_wizard_empowerment_preview',target:v.kind==='fx'?v.target.id:undefined,x:v.pos.x,y:v.pos.y,at:v.kind==='fx'?v.at:undefined,spriteAt:v.spriteAt,alpha:buffs.alpha(v,time),reverse:v.reverseAt!==undefined})).sort((a,b)=>a.name.localeCompare(b.name)||a.x-b.x||a.y-b.y||(a.at??a.spriteAt)-(b.at??b.spriteAt))
  const native=row.effects.filter(e=>e.name!=='mod_wizard_skill_b').map(e=>({name:e.name,target:e.target,x:e.pos.x,y:e.pos.y,at:e.at,spriteAt:e.spriteAt,alpha:e.alpha,reverse:!!e.reverse})).sort((a,b)=>a.name.localeCompare(b.name)||a.x-b.x||a.y-b.y||(a.at??a.spriteAt)-(b.at??b.spriteAt))
  assert.equal(visuals.length,native.length,ctx+`/visual count ${JSON.stringify(visuals)}/${JSON.stringify(native)}`);for(let i=0;i<visuals.length;i++)for(const k of Object.keys(visuals[i]))if(typeof visuals[i][k]==='number')assert(Math.abs(visuals[i][k]-native[i][k])<1e-7,ctx+`/visual${i}/${k} ${visuals[i][k]}/${native[i][k]}`);else assert.equal(visuals[i][k],native[i][k],ctx+`/visual${i}/${k}`)
  frames++
 }
 const nativeShots=oracle.queued.filter(q=>q.name.startsWith('bolt_tower_wizard'));assert.equal(shots.length,nativeShots.length,c.name+'/shot count');for(let i=0;i<shots.length;i++){assert.equal(shots[i].name,nativeShots[i].name);assert(Math.abs(shots[i].at-nativeShots[i].at)<1e-8,c.name+'/shot time');for(const key of ['x','y'])assert(Math.abs(shots[i].from[key]-nativeShots[i].pos[key])<1e-8,c.name+'/shot origin')}
 assert.equal(sounds.length,oracle.sounds.length,c.name+'/sound count');for(let i=0;i<sounds.length;i++){assert.equal(sounds[i].name,oracle.sounds[i].name);assert(Math.abs(sounds[i].at-oracle.sounds[i].at)<1e-8,c.name+'/sound time')}
}
console.log(`${frames} original wizard empowerment frames match: native caster sprites/clocks, strict retries, three ranks, source sale, target upgrade/windup rejection, modifier/FX/decal/preview clocks and fade lifetimes; basic targeting isolated`)
const {TowerSystem}=await import('../src/game/TowerSystem.ts'),{GameSession}=await import('../src/game/GameSession.ts'),{PathFollower}=await import('../src/game/PathFollower.ts'),level=read('public/data/level01.json'),program=read('public/data/level01-campaign.json'),wizardRows=read('analysis/wizard-power-oracle.json'),towers=new TowerSystem(level,'campaign',templates),site=towers.sites[0];site.tower='tower_wizard_lvl4';site.spent=1000;let gold=1000
for(const [i,row]of wizardRows.entries()){if(i<3)gold=towers.upgradePower(site.id,'skill_b',gold);else assert.throws(()=>towers.upgradePower(site.id,'skill_b',gold));assert.equal(site.powerLevels.skill_b,row.level);assert.equal(gold,row.gold);assert.equal(site.spent,row.spent)}assert.equal(towers.refund(site,0),1550);assert.equal(towers.refund(site,1),930)
// Real GameSession: B modifies another wizard's actual projectile damage.
{
 const game=new GameSession(level,program,templates,()=>.25),[source,target]=game.towers.sites;source.tower='tower_wizard_lvl4';target.tower='tower_wizard_lvl1';source.pos={x:500,y:350};target.pos={x:600,y:350};game.gold=1000;game.upgradeTowerPower(source.id,'skill_b');game.heroes.team.forEach(h=>h.scriptLocked=true)
 game.spawnCinematicEnemy('enemy_bandit',1,{x:700,y:350});const enemy=game.enemies.at(-1);enemy.path=new PathFollower([{x:700,y:350},{x:1200,y:350}]);enemy.frozen=true;enemy.hp=5000;enemy.template.health.hp_max=5000;enemy.template.health.magic_armor=0
 let sawEmpowered=false;for(let i=0;i<150;i++){game.advance(1/30);sawEmpowered||=game.combat.projectiles.some(p=>p.name==='bolt_tower_wizard_lvl1'&&p.damageFactor===1.5)}
 assert.equal(target.damageFactor,1.5);assert(enemy.hp<5000);assert(sawEmpowered)
 game.sellTower(source.id);game.advance(1/30);assert.equal(target.damageFactor,1.5,'native wizard buff survives source sale');game.advance(12);assert.equal(target.damageFactor,1,'timed factor expires after source sale')
}
console.log('Original wizard B purchase/refund/max prices and actual GameSession empowered projectiles, source-sale duration and expiry verified')
