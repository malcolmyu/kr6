import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {EnemySkills} from '../src/game/EnemySkills.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),rows=read('analysis/smoke-dodge-oracle.json'),templates=read('public/data/entities.json'),level=read('public/data/level03.json')
for(const r of rows){let draws=0;const random=()=>{draws++;return r.roll},owner=new EnemySkills(level,templates,random),dodge=new DodgeSystem(random,templates),e={id:1,name:'enemy_bandit',hp:30,path:{position:{x:500,y:350}},template:structuredClone(templates.enemy_bandit)};e.template.unit.is_stunned=r.stunned;if(r.prior)e.dodge={chance:.2,ts:0,active:false}
 const m={kind:'modifier',enemy:e,pos:{x:0,y:0},inserted:false,ts:0,spriteTs:0,facingLeft:false,offset:{x:0,y:0}},pops=[];dodge.onCreate=(name,p)=>pops.push(p)
 assert(owner.runtime.insert(m,1));assert.equal(dodge.checkEnemy(e,1.1,r.ranged,{damage_type:r.damageType}),r.dodged)
 if(e.dodge.active&&e.dodge.show_pop)dodge.show(e,1.1)
 const d=e.dodge;assert.deepEqual({chance:d.chance,active:d.active,ts:d.ts,lastCheck:d.last_check_ts,lastDodge:d.last_doge_ts,ranged:d.ranged,silent:d.silent,showPop:d.show_pop},{...r.state,lastDodge:r.state.lastDodge})
 assert.equal(draws,r.draws.length);assert.equal(pops.length,r.pops.length)
 for(const [i,p]of pops.entries()){const n=r.pops[i];assert.equal(p.name,n.name);assert.deepEqual(p.pos,n.pos);assert(Math.abs(p.rotation-n.rotation)<1e-12)}
 owner.runtime.remove(m,1.2);assert.equal(e.dodge?.chance,r.restoredChance)
}
console.log(`${rows.length} original smoke dodge cases match component install/restore, stun/no-dodge/ranged gates, shared RNG, native miss-pop position/rotation and active reset; isolated helper coverage, not all combat-family timing`)
