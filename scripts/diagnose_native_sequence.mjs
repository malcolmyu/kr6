import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const variant=process.argv[2]??'normal',prefix=variant==='normal'?'native-sequence':`native-${variant}`,fileVariant=variant==='normal'?'':`-${variant}`
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),native=read(`analysis/level-entity-bootstrap-3-${variant==='archers'?'campaign':'iron'}-entry${fileVariant}-runtime-sequence.json`),inputs=read(variant==='normal'?'analysis/native-runtime-smoke-input.json':`analysis/native-runtime-${variant}-input.json`),values=[.11,.83,.29,.71,.43,.59,.19,.97,.37,.61,.07,.89,.47,.53,.23,.79]
let g,calls=[]
const random=()=>{const value=values[calls.length%values.length];calls.push({tick:g?Math.round(g.time*30):0,value,stack:new Error().stack.split('\n').slice(2,5)});return value}
g=new GameSession(read('public/data/level03.json'),read(`public/data/level03-${native.mode}.json`),read('public/data/entities.json'),random,native.mode,['archers','knights','catapult','wizard'],native.profileOverrides?.powerUpgrades??{})
g.heroes.playerLevel=native.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(native.profileOverrides?.powerXp??{},native.playerLevel,3);applyStageSetup(g,3,native.mode,true,native.mode==='iron')
const nativeSpawns=native.events.filter(e=>e.kind==='create'&&e.template.startsWith('enemy_'))
const canonical=e=>({tick:e.tick,kind:e.kind,id:e.id,template:e.template}),frames=[]
let firstRandomBoundary,firstTable,firstActor,firstKnight
for(const f of native.frames){
 for(const c of inputs.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else if(c.kind==='power'){if(!g.powers.select(c.power,g.time)||!g.powers.cast(c.pos,g.time))throw new Error('Rejected power command')}else g.build(c.holder,c.tower)
 g.advance(1/30)
 if(!firstRandomBoundary&&calls.length!==f.randomBoundary)firstRandomBoundary={tick:f.tick,web:calls.length,native:f.randomBoundary,webCalls:calls.slice(-12),nativeCalls:native.randomDraws.slice(Math.max(0,f.randomBoundary-12),f.randomBoundary)}
 const r=g.entities.registry,a={nextId:r.nextId,count:r.count,max:r.max,entities:[...r.entities.values()].map(({id,template})=>({id,template})),inserts:r.pendingInserts.map(e=>e.id),removes:r.pendingRemovals.map(e=>e.id)},b={nextId:f.nextId,count:f.count,max:f.max,entities:f.entities.map(({id,template})=>({id,template})),inserts:f.inserts,removes:f.removals}
 if(!firstTable&&JSON.stringify(a)!==JSON.stringify(b))firstTable={tick:f.tick,web:a,native:b}
 const actors=g.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined&&!g.entities.entity(e)?.pending_removal),original=f.entities.filter(e=>e.template.startsWith('enemy_')&&e.hp>0&&!f.removals.includes(e.id))
 if(!firstActor){if(actors.length!==original.length)firstActor={tick:f.tick,webCount:actors.length,nativeCount:original.length};else for(const e of actors){const n=f.entities.find(n=>n.id===nativeSpawns[e.id-1]?.id);if(n&&(n.hp!==e.hp||Math.hypot(n.pos.x-e.path.position.x,n.pos.y-e.path.position.y)>1e-7)){firstActor={tick:f.tick,web:{id:e.id,name:e.name,pos:{...e.path.position},hp:e.hp},native:n};break}}}
 if(!firstKnight)for(const s of g.barracks.soldiers){const id=g.entities.entity(s)?.id,n=f.entities.find(e=>e.id===id&&e.template===s.name);if(!n)continue;const target=n.target?nativeSpawns.findIndex(e=>e.id===n.target)+1:undefined;if(s.hp!==n.hp||s.target?.id!==target||Math.hypot(s.pos.x-n.pos.x,s.pos.y-n.pos.y)>1e-7){firstKnight={tick:f.tick,id,web:{hp:s.hp,pos:{...s.pos},target:s.target?.id},native:{hp:n.hp,pos:n.pos,target}};break}}
 frames.push({tick:f.tick,webCalls:calls.length,nativeCalls:f.randomBoundary,webTime:g.time})
}
const webEvents=g.entities.events.map(canonical),nativeEvents=native.events.map(canonical)
let firstEvent;for(let i=0;i<Math.max(webEvents.length,nativeEvents.length);i++)if(JSON.stringify(webEvents[i])!==JSON.stringify(nativeEvents[i])){firstEvent={index:i,web:webEvents[i],native:nativeEvents[i]};break}
const result={firstRandomBoundary,firstEvent,firstTable,firstActor,firstKnight,frames,calls,nativeCalls:native.randomDraws}
writeFileSync(`analysis/${prefix}-diagnostic.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({firstRandomBoundary:firstRandomBoundary&&{tick:firstRandomBoundary.tick,web:firstRandomBoundary.web,native:firstRandomBoundary.native},firstEvent,firstTable:firstTable?.tick,firstActor,firstKnight}))
