import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/wizard-copies-motion-oracle.json').filter(r=>r.birth===19);let frames=0
for(const row of rows){
 const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),templates,()=>row.roll,'iron');applyStageSetup(g,3,'iron',true,true);for(const h of g.heroes.team)h.scriptLocked=true;for(const site of g.towers.sites)site.attackDisabled=true
 while(g.tick<18)g.advance(1/30)
 const pos={x:row.from.x+row.delta.x,y:row.from.y+row.delta.y};g.spawnCinematicEnemy('enemy_bandit',1,pos);const e=g.enemies.at(-1);e.hp=e.template.health.hp_max=5000;e.template.unit.hit_offset={x:0,y:0};e.frozen=true;e.motionSpeed=row.velocity;Object.assign(e.path.position,pos)
 const payloads=[];g.combat.onCopiesPayload=(pos,level,time)=>payloads.push({pos,level,time})
 g.combat.wizardTowers.onCopies({id:'source'},'bullet_skill_c_wizard_1',row.from,pos,e.id,2,50,50,g.time)
 for(const f of row.frames){Object.assign(e.path.position,f.target);g.advance(1/30);const p=g.combat.projectiles.find(p=>p.name==='bullet_skill_c_wizard_1'),entity=p&&g.entities.entity(p),ctx=`copies actual session/${row.delta.x}/${row.delta.y}/${row.velocity.x}/${row.velocity.y}/${row.roll}/${f.tick}`
  assert.equal(g.tick,f.tick);assert(p?.registryBound&&g.entities.registry.entities.get(entity.id),ctx+'/real registered projectile');assert(Math.abs(p.pos.x-f.pos.x)<1e-8&&Math.abs(p.pos.y-f.pos.y)<1e-8,ctx+'/motion');assert.equal(e.hp,5000-f.damage,ctx+'/deferred health');assert.equal(payloads.length,f.payload?1:0,ctx+'/payload clock');frames++
 }
 assert.equal(payloads[0].level,2);assert(g.entities.events.some(e=>e.template==='ps_skill_c_wizard_1'&&e.kind==='insert'));assert(g.combat.firebookTrails.trails.every(t=>!t.emit));
}
console.log(`${rows.length} actual registered GameSession first-book cases / ${frames} frames match original insertion/main motion, deferred HP, paper emitter insertion and stopped emission, always-once bounce callback and level; quiet waves and controlled target isolate first stage, complete C chain still pending`)
