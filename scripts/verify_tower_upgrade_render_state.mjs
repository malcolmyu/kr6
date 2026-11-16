import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {ExoSprite} from '../src/game/ExoSprite.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),level=read('public/data/level03.json'),program=read('public/data/level03-campaign.json'),art=read('public/data/towers-art.json')
for(const kind of ['archers','wizard','catapult','culverine']){
 const g=new GameSession(level,program,templates,()=>.5),site=g.towers.sites.find(s=>!s.tower),pos={x:site.pos.x+100,y:site.pos.y+20};site.tower=`tower_${kind}_lvl3`;site.spent=300;g.gold=10000
 const e={id:123,name:'enemy_bandit',hp:10000,template:structuredClone(templates.enemy_bandit),path:new PathFollower([pos,{x:pos.x+500,y:pos.y}])};e.template.motion.max_speed=0
 for(let tick=1;tick<=34;tick++)g.combat.advance(tick*(1/30),[site],[e])
 const states=kind==='archers'?g.combat.shooters:kind==='wizard'?g.combat.wizardTowers.states:kind==='catapult'?g.combat.catapultTowers.states:g.combat.culverineTowers.states
 assert(states.has(site.id),'actual old source controller exists before upgrade')
 if(kind==='wizard'){
  const stale=states.get(site.id).parts[3],scroll=templates.tower_wizard_lvl4.render.sprites[3],sprite=new ExoSprite({},art.exos[scroll.prefix])
  assert.throws(()=>sprite.duration(stale.name),/Missing EXO animation/,'old third-rank caster pose is not an animation in the new fourth-rank scroll')
  assert(sprite.duration(scroll.name)>0,'new scroll idle is valid before the next logic tick')
  assert(g.combat.projectiles.length>0,'real paired bolts are in flight before replacing source')
 }
 const ids=g.combat.projectiles.map(p=>p.id),pending=g.combat.pendingWizardShots?.length
 g.upgradeTower(site.id)
 assert.equal(site.tower,`tower_${kind}_lvl4`);assert(!states.has(site.id),'renderer cannot consume an old source controller between UI mutation and next30Hz tick')
 assert.deepEqual(g.combat.projectiles.map(p=>p.id),ids,'already fired projectiles survive immediate source-state replacement');assert.equal(g.combat.pendingWizardShots?.length,pending,'queued shots survive')
}
console.log('All four ranged families discard old source controllers synchronously on native entity upgrade while retaining queued/in-flight shots; actual wizard3 caster→wizard4 scroll animation mismatch reproduces the pre-fix render exception')
