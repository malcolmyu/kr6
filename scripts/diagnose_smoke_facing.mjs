import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),n=read('analysis/level-entity-bootstrap-3-iron-entry-royal-global-runtime-constant.json'),inputs=read('analysis/native-runtime-royal-global-input.json')
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>.5,'iron',['archers','knights','catapult','wizard'],n.profileOverrides.powerUpgrades)
g.heroes.playerLevel=n.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(n.profileOverrides.powerXp,n.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const rows=[]
for(const f of n.frames.slice(0,1290)){
 for(const c of inputs.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else if(c.kind==='power'){g.powers.select(c.power,g.time);g.powers.cast(c.pos,g.time)}else g.build(c.holder,c.tower)
 g.advance(1/30)
 if(f.tick>=1260){const h=g.heroes.team[1];rows.push({tick:f.tick,web:{facing:h.facingLeft,pos:h.pos,target:g.entities.entity(h.target??{})?.id,attack:h.attack?.startedAt,meleeVisual:h.meleeVisual,idleVisual:h.idleVisual,visual:h.visualOverride,ranged:g.heroes.ranged.isAttacking(h),idle:g.barracks.idleStates.get(h)},native:f.entities.find(e=>e.id===58),casters:g.enemies.filter(e=>g.enemySkills.casting.has(e.id)).map(e=>({id:g.entities.entity(e).id,state:g.enemySkills.casting.get(e.id),pos:{...e.path.position},motion:e.motionSpeed,blocked:e.blocked,visual:e.visualOverride}))})}
}
writeFileSync('analysis/smoke-facing-diagnostic.json',JSON.stringify(rows,null,2));console.log(rows.filter(r=>r.web.facing!==r.native.flipX).map(r=>r.tick))
