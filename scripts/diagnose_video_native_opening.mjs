import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const scenario=process.argv.includes('--shield-solo')?'zefira-shield-solo':process.argv.includes('--shield')?'zefira-shield':'video-opening'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),n=read(`analysis/level-entity-bootstrap-3-iron-cleared-${scenario}-runtime-lcg104.json`),commands=read(`analysis/native-runtime-${scenario}-input.json`),p=n.profileOverrides
let seed=104,calls=0;const draws=[]
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),read('public/data/entities.json'),()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;calls++;if(calls>=5085&&calls<=5110)draws.push({call:calls,stack:new Error().stack.split("\n").slice(2,5)});return seed/4294967296},'iron',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=n.playerLevel;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,n.playerLevel,3);applyStageSetup(g,3,'iron',true,true)
const first={},samples=[],heroRows=[]
for(const f of n.frames){
 for(const c of commands.filter(c=>c.tick===f.tick)){if(c.kind==='send_wave')g.callNextWave();else if(c.kind==='hero-rally'){g.heroes.selectedId=g.heroes.team.find(h=>h.name===c.name).id;assert(g.heroes.moveSelected(c.pos))}else if(c.kind==='rally')assert(g.setRally(c.holder,c.pos));else g.build(c.holder,c.tower)}
 g.advance(1/30)
 if(f.tick>=1925&&f.tick<=1960){const h=g.heroes.zefira,a=f.entities.find(e=>e.id===58),shot=g.heroes.ranged.shots.get(h.id);heroRows.push({tick:f.tick,web:{pos:{...h.pos},readyAt:h.readyAt,attack:!!h.attack,moving:h.moving,target:h.target?.id,xp:h.xp,queued:h.xpQueued,locked:h.scriptLocked,deploying:h.deploying,visual:h.visualOverride,idle:h.idleVisual,ranged:h.rangedUntil,shot:shot&&{at:shot.startedAt,fired:shot.fired,target:shot.target.id}},native:{animation:a.animation,ts:a.spriteTs,pos:a.pos,target:a.target}})}
 const fail=(key,web,native)=>{if(!first[key])first[key]={tick:f.tick,web,native}}
 if(calls!==f.randomBoundary)fail('random',calls,f.randomBoundary)
 const r=g.entities.registry;for(const k of ['nextId','count','max'])if(r[k]!==f[k])fail(k,r[k],f[k])
 for(const k of ['gold','lives'])if(g[k]!==f[k])fail(k,g[k],f[k])
 for(const e of g.heroes.team){const a=f.entities.find(a=>a.id===g.entities.entity(e)?.id);if(!a||a.template!==e.name)continue;const pos=e.pos??e.path.position;if(e.hp!==a.hp)fail('hp',{id:a.id,hp:e.hp},{hp:a.hp});if(Math.hypot(pos.x-a.pos.x,pos.y-a.pos.y)>1e-7)fail('position',{id:a.id,name:e.name,pos:{...pos},visual:e.visualOverride},{pos:a.pos,name:a.animation,at:a.spriteTs});if('xp'in e&&Math.abs(e.xp-a.hero.xp)>1e-7)fail('xp',{id:a.id,xp:e.xp},a.hero)}
 const list=[...r.entities.values()].map(e=>[e.id,e.template]),expected=f.entities.map(e=>[e.id,e.template]);if(JSON.stringify(list)!==JSON.stringify(expected))fail('entities',list,expected)
 if([1905,1935,1995,2055].includes(f.tick))samples.push({tick:f.tick,media:g.time+13.5,webGold:g.gold,nativeGold:f.gold})
}
const canon=e=>({tick:e.tick,kind:e.kind,id:e.id,template:e.template}),a=g.entities.events.map(canon),b=n.events.map(canon);for(let i=0;i<Math.max(a.length,b.length);i++)if(JSON.stringify(a[i])!==JSON.stringify(b[i])){first.event={index:i,web:a[i],native:b[i]};break}
writeFileSync(scenario==='video-opening'?'analysis/video-native-opening-diagnostic.json':`analysis/${scenario}-diagnostic.json`,JSON.stringify({note:'Same inferred profile/input and controlled LCG,2055-frame opening; diagnostics, not full video acceptance',first,samples,heroRows,draws},null,2));console.log(JSON.stringify({first,samples,heroRows,draws},null,2))
