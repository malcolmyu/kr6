import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),n=read('analysis/level-entity-bootstrap-3-iron-entry-royal-runtime-sequence.json'),inputs=read('analysis/native-runtime-royal-input.json'),values=[.11,.83,.29,.71,.43,.59,.19,.97,.37,.61,.07,.89,.47,.53,.23,.79]
let calls=0;const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>values[calls++%16],'iron',['archers','knights','catapult','wizard']);g.heroes.playerLevel=n.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},n.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const web=[]
for(const [family,array]of [['tower',g.combat.projectileHits],['soldier',g.barracks.knightDamage]]){
 const push=array.push;array.push=function(...hits){for(const h of hits)web.push({tick:Math.round(g.time*30),id:g.entities.registry.nextId-1,family,value:(h.damage??h.packet).value,enemy:g.entities.entity(h.enemy)?.id,factors:g.towers.sites.map(s=>[s.id,s.damageFactor])});return push.apply(this,hits)}
}
for(const f of n.frames.slice(0,630)){for(const c of inputs.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else if(c.kind==='power'){g.powers.select(c.power,g.time);g.powers.cast(c.pos,g.time)}else g.build(c.holder,c.tower);g.advance(1/30)}
const rows=web.filter(w=>w.tick>=590).map(w=>({web:w,native:n.damageTrace.find(d=>d.id===w.id)}));writeFileSync('analysis/royal-damage-diagnostic.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.filter(r=>r.web.value!==r.native?.value),null,2))
