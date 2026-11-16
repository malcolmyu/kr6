import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {HomingBoltMotion} from '../src/game/HomingBoltMotion.ts'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
const read=name=>JSON.parse(readFileSync(name)),templates=read('public/data/entities.json')
let frames=0
for(const trace of read('analysis/zefira-bolt-oracle.json')) {
 const motion=new HomingBoltMotion(templates.bullet_zefira.bullet),pos={x:0,y:0}
 for(const expected of trace.frames){const done=motion.step(pos,trace.to,1/30);if(done){pos.x=trace.to.x;pos.y=trace.to.y}assert.equal(done,expected.done);assert(Math.hypot(pos.x-expected.pos.x,pos.y-expected.pos.y)<1e-8);frames++}
}
const game=new GameSession(read('public/data/level01.json'),{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1}]},templates,()=>.5)
const hero=game.heroes.insert('hero_zefira',{x:500,y:350},0)
assert.equal(hero.hp,150);assert.equal(hero.template.health.armor,.02);assert.deepEqual(hero.rangedDamage,[4,12]);assert.equal(hero.template.melee.attacks[1].disabled,true)
const template=structuredClone(templates.enemy_bandit);template.motion.max_speed=0
const target={id:100,name:'enemy_bandit',born:0,age:0,hp:20,template,path:new PathFollower([{x:600,y:350},{x:900,y:350}])}
game.enemies.push(target)
const sounds=[],effects=[];game.onSound=name=>sounds.push(name);game.heroes.ranged.onEffect=name=>effects.push(name)
game.advance(5)
assert(target.diedAt!==undefined);assert.equal(hero.pos.x,500);assert(sounds.includes('HeroZefiraBasicAttackCast'));assert(effects.includes('fx_bullet_zefira'));assert.equal(game.gold,template.enemy.gold)
for(const [stage,mode] of [[1,'iron'],[1,'campaign'],[2,'iron'],[2,'campaign'],[3,'campaign'],[3,'iron']]) {
 const data=read(`public/data/level0${stage}.json`),g=new GameSession(data,read(`public/data/level0${stage}-${mode}.json`),templates,()=>.5,mode)
 applyStageSetup(g,stage,mode,true,true)
 assert.deepEqual(g.heroes.team.map(h=>h.name),['hero_gerald','hero_zefira'])
 assert.deepEqual(g.heroes.team.map(h=>h.pos),data.data.custom_spawn_pos.slice(0,2).map(p=>p.pos))
}
const intro=new GameSession(read('public/data/level02.json'),read('public/data/level02-campaign.json'),templates,()=>.5)
applyStageSetup(intro,2,'campaign',true,false)
assert(intro.cinematic);assert.equal(intro.enemies.length,2);assert(intro.enemies.every(e=>e.hp===5&&e.template.enemy.gold===0));assert.equal(intro.combat.bulletOverrides.get('3'),'bolt_tower_wizard_cinematic')
const nativeEvents=read('analysis/zefira-intro-oracle.json'),observed=[]
let previous={curtains:true,guiHidden:true,portrait:false,balloon:undefined}
for(let frame=1;frame<=300;frame++){
 const time=frame/30,h=intro.heroes;h.advance(time)
 if(h.balloon?.id && h.balloon.id!==previous.balloon)observed.push({name:h.balloon.pos?'show-balloon_tutorial-pos':'show-balloon_tutorial',id:h.balloon.id,at:time})
 if(previous.curtains&&!h.curtains)observed.push({name:'hide-curtains',at:time})
 if(previous.guiHidden&&!h.guiHidden)observed.push({name:'show-gui',at:time})
 if(!previous.portrait&&h.zefira.portraitVisible)observed.push({name:'show-hero',at:time})
 previous={curtains:h.curtains,guiHidden:h.guiHidden,portrait:h.zefira.portraitVisible,balloon:h.balloon?.id}
}
for(const event of observed){const expected=nativeEvents.find(e=>e.name===event.name&&e.id===event.id);assert(expected);assert(Math.abs(event.at-expected.at)<1e-8,JSON.stringify({event,expected}))}
assert.equal(observed.length,6)

assert.equal(intro.cinematic,false);assert.equal(intro.heroes.zefira.portraitVisible,true);assert.equal(intro.combat.bulletOverrides.has('3'),false);assert(intro.heroes.zefiraIntro.finished)
console.log(`${frames} original Zefira homing frames match; magical ranged attack/kill/effect, original team spawns and stage-two introduction verified (advanced hero skills pending)`)

// Flying actors bypass minimum range; an aim inside one speed step hits on insertion.
{
 const {HeroSystem}=await import('../src/game/HeroSystem.ts'),{BarracksCombat}=await import('../src/game/BarracksCombat.ts'),h=new HeroSystem(templates,new BarracksCombat(templates),()=>.5),hero=h.insert('hero_zefira',{x:500,y:350},0),template=structuredClone(templates.enemy_bandit);template.vis.flags|=128
 const e={id:999,name:'enemy_bandit',hp:1000,frozen:true,template,path:new PathFollower([{x:518,y:356},{x:600,y:356}])};hero.readyAt=-9
 for(let tick=0;tick<=12;tick++)h.ranged.advance(tick*(1/30),1/30,[hero],[e])
 assert.equal(h.ranged.projectiles.length,0);assert.equal(h.ranged.queuedProjectiles.length,1);h.ranged.advance(13*(1/30),1/30,[hero],[e]);assert.equal(e.hp,1000,'native first main has not acquired its target when the initial aim already lies inside the arrival radius');assert.equal(h.ranged.projectiles[0].doneAt,13*(1/30));assert.equal(h.ranged.pops.pops.length,0,'nonlethal ZAP remains kill-gated');h.ranged.advance(14*(1/30),1/30,[hero],[e]);assert.equal(h.ranged.projectiles.length,0)
}
console.log('Native close-target insertion boundary: flying minimum override, queued first-frame hit, retained impact body/next-tick removal and nonlethal ZAP rejection verified')
