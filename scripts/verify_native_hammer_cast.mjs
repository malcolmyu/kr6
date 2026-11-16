import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/zefira-hammer-oracle.json')
let frames=0,packets=0
for(const row of rows){const hs=new HeroSystem(templates,new BarracksCombat(templates),()=>.5),h=hs.insert('hero_zefira',{x:500,y:350},0),owner=hs.zefiraSkills,r=owner.nativeHammer,queued=[],damage=[],fx=[],offsets=[[0,0],[50,0],[50.01,0],[0,35],[0,35.01],[-40,-10]]
 owner.configure(['skill_a',...(row.level>=2?['upg_sa1']:[]),...(row.level===3?['upg_sa2']:[])]);owner.deferHammer=true;h.facingLeft=row.flip
 const enemies=offsets.map((offset,id)=>({id:id+1,name:'enemy_bandit',hp:1000,template:structuredClone(templates.enemy_bandit),path:{position:{x:500+(row.flip?-40:40)+offset[0],y:350+offset[1]}}}));enemies.push({id:100,name:'enemy_crow',hp:1000,template:structuredClone(templates.enemy_crow),path:{position:{x:500+(row.flip?-40:40),y:350}}});h.target=enemies[0]
 r.selectionTargets=()=>enemies.slice(0,1);r.hitTargets=p=>enemies.filter(e=>!(e.template.vis.flags&128)&&!(e.template.vis.bans&8)&&(e.path.position.x-p.x)**2+(e.path.position.y-p.y)**2/(.7*.7)<=50**2)
 r.onCreateDamage=()=>packets++;r.onDamage=(enemy,value)=>damage.push({target:{offset:offsets[enemy.id-1],name:enemy.name},value,type:4});r.onQueue=(name,m)=>queued.push({name,time:current,target:m.kind==='stun'?m.enemy.id:undefined,pos:m.kind==='decal'?m.pos:undefined});r.onEffect=(name,pos,time)=>fx.push({name,pos,time});let current=13
 assert(owner.tryHammer(h,13,enemies))
 for(const sample of row.frames){current=Math.round(sample.at*30)/30;r.advanceCast(current);assert.equal(h.visualOverride?.name??'skill_1',sample.name);assert.equal(h.xpQueued,sample.xp);assert.equal(!owner.cast,sample.done);assert.equal(!!owner.cast?.hit,sample.cooldownTs===13&&!sample.done);frames++}
 const canonical=d=>JSON.stringify(d.target),sort=items=>[...items].sort((a,b)=>canonical(a).localeCompare(canonical(b)));assert.deepEqual(sort(damage),sort(row.damage));assert.equal(queued.filter(e=>e.name==='mod_zefira_skill_a_stun').length,row.effects.filter(e=>e.name==='mod_zefira_skill_a_stun').length);assert.equal(fx.length,1);assert.equal(fx[0].time,13.7);assert.equal(queued.filter(e=>e.name==='decal_zefira_skill_a_hit').length,1)
}
console.log(`${rows.length} original hammer cast cases/${frames} frames/${packets} area packets match three skill ranks/both facings, native hit wait/completion, skill XP, damage bounds, elliptical edge exclusions and queued stun/impact/decal bodies; original helper fixture prescribes target selection and excludes health processing`)
